// @vitest-environment node
import { createHmac, randomBytes } from "node:crypto";
import { MongoClient, ObjectId } from "mongodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createAuthentication,
  invitationDigest,
} from "@/features/auth/server/auth-factory";
import { ensureAuthenticationSchema } from "@/features/auth/server/auth-schema";
import { migrateLegacyAccounts } from "@/features/auth/server/legacy-account-migration";

const databaseName = `dna_auth_test_${randomBytes(12).toString("hex")}`;
const emails: Array<{ to: string; subject: string; text: string }> = [];
const baseURL = "http://localhost:3000";
let client: MongoClient;
let auth: ReturnType<typeof createAuthentication>;
let ready = false;

function authenticatorCode(uri: string) {
  const secret = new URL(uri).searchParams.get("secret")!;
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...secret.toUpperCase().replace(/=+$/, "")]
    .map((c) => alphabet.indexOf(c).toString(2).padStart(5, "0"))
    .join("");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((byte) => parseInt(byte, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac("sha1", key).update(counter).digest();
  return String(
    (digest.readUInt32BE(digest[digest.length - 1]! & 15) & 0x7fffffff) % 1000000,
  ).padStart(6, "0");
}

function browser(ip: string) {
  const cookies = new Map<string, string>();
  return {
    async request(
      path: string,
      body?: Record<string, unknown>,
      extra: Record<string, string> = {},
    ) {
      const response = await auth.handler(
        new Request(new URL(path, baseURL), {
          method: body ? "POST" : "GET",
          headers: {
            origin: baseURL,
            "content-type": "application/json",
            "x-forwarded-for": ip,
            cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
            ...extra,
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        }),
      );
      for (const value of response.headers.getSetCookie()) {
        const [pair] = value.split(";");
        const i = pair!.indexOf("=");
        cookies.set(pair!.slice(0, i), pair!.slice(i + 1));
      }
      return response;
    },
  };
}

describe.skipIf(process.env.RUN_AUTH_LIVE !== "1")(
  "Better Auth against an isolated MongoDB database",
  () => {
    beforeAll(async () => {
      if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
      client = await new MongoClient(process.env.MONGODB_URI).connect();
      const database = client.db(databaseName);
      await ensureAuthenticationSchema(database);
      ready = true;
      auth = createAuthentication({
        database,
        client,
        baseURL,
        secret: randomBytes(32).toString("base64"),
        sendMail: async (message) => {
          emails.push(message);
        },
      });
    }, 30000);
    afterAll(async () => {
      if (ready && /^dna_auth_test_[a-f0-9]{24}$/.test(databaseName))
        await client.db(databaseName).dropDatabase();
      await client?.close();
    });

    it("enforces invitations, email verification, MFA, backup codes, recovery and revocation", async () => {
      const db = client.db(databaseName);
      const invitedEmail = "admin@example.test";
      const invitation = randomBytes(32).toString("hex");
      const password = "A-long-test-password-719!";
      const actor = browser("192.0.2.10");
      const outsider = await actor.request("/api/auth/sign-up/email", {
        email: "outsider@example.test",
        name: "Outsider",
        password,
      });
      expect(outsider.status).toBe(403);
      expect(
        await db.collection("auth_users").findOne({ email: "outsider@example.test" }),
      ).toBeNull();
      const platform = await db.collection("platform_users").insertOne({
        normalizedEmail: invitedEmail,
        displayName: "Test administrator",
        authUserId: null,
        role: "administrator",
        status: "invited",
        invitation: {
          invitationId: invitationDigest(invitation),
          expiresAt: new Date(Date.now() + 86400000),
          status: "pending",
        },
      });
      const signup = await actor.request(
        "/api/auth/sign-up/email",
        { email: invitedEmail, name: "Ignored", password },
        { "x-invitation-token": invitation },
      );
      expect(signup.status, await signup.clone().text()).toBe(200);
      const pendingLogin = await actor.request("/api/auth/sign-in/email", {
        email: invitedEmail,
        password,
      });
      expect(pendingLogin.status).toBe(403);
      const verifyURL = emails
        .find((mail) => mail.to === invitedEmail && mail.subject.includes("Verificá"))!
        .text.match(/http\S+/)![0];
      await actor.request(verifyURL);
      const login = await actor.request("/api/auth/sign-in/email", {
        email: invitedEmail,
        password,
      });
      expect(login.status, await login.clone().text()).toBe(200);
      const sessionBefore = await (await actor.request("/api/auth/get-session")).json();
      expect(sessionBefore.session.mfaVerified).toBe(false);
      await db
        .collection("platform_users")
        .updateOne(
          { _id: platform.insertedId },
          { $set: { authUserId: sessionBefore.user.id, status: "active" } },
        );

      const crossOrigin = await actor.request(
        "/api/auth/two-factor/enable",
        { password },
        { origin: "https://attacker.example" },
      );
      expect(crossOrigin.status).toBe(403);
      const enrollment = await actor.request("/api/auth/two-factor/enable", {
        password,
      });
      expect(enrollment.status, await enrollment.clone().text()).toBe(200);
      const { totpURI, backupCodes } = await enrollment.json();
      const verified = await actor.request("/api/auth/two-factor/verify-totp", {
        code: authenticatorCode(totpURI),
      });
      expect(verified.status, await verified.clone().text()).toBe(200);
      const verifiedSession = await (
        await actor.request("/api/auth/get-session")
      ).json();
      expect(verifiedSession.user.twoFactorEnabled).toBe(true);
      expect(verifiedSession.session.mfaVerified).toBe(true);
      const oldSession = await db
        .collection("auth_sessions")
        .findOne({ token: sessionBefore.session.token });
      expect(oldSession).toBeNull();
      expect(
        (await actor.request("/api/auth/two-factor/disable", { password })).status,
      ).toBe(403);
      await actor.request("/api/auth/sign-out", {});
      expect(await (await actor.request("/api/auth/get-session")).json()).toBeNull();

      const nextLogin = await actor.request("/api/auth/sign-in/email", {
        email: invitedEmail,
        password,
      });
      expect((await nextLogin.json()).twoFactorRedirect).toBe(true);
      expect(await (await actor.request("/api/auth/get-session")).json()).toBeNull();
      expect(
        (
          await actor.request("/api/auth/two-factor/verify-backup-code", {
            code: backupCodes[0],
          })
        ).status,
      ).toBe(200);
      const backupSession = await (await actor.request("/api/auth/get-session")).json();
      expect(backupSession.session.mfaVerified).toBe(true);
      await db
        .collection("auth_sessions")
        .updateOne(
          { token: backupSession.session.token },
          { $set: { mfaVerified: false } },
        );
      expect(
        (
          await actor.request("/api/auth/two-factor/generate-backup-codes", {
            password,
          })
        ).status,
      ).toBe(403);
      await db
        .collection("auth_sessions")
        .updateOne(
          { token: backupSession.session.token },
          { $set: { mfaVerified: true } },
        );
      expect(
        (
          await actor.request("/api/auth/two-factor/verify-backup-code", {
            code: backupCodes[0],
          })
        ).ok,
      ).toBe(false);

      const recovery = browser("192.0.2.11");
      await recovery.request("/api/auth/request-password-reset", {
        email: invitedEmail,
        redirectTo: "/reset-password",
      });
      const resetURL = emails
        .findLast((mail) => mail.subject.includes("Restablecer"))!
        .text.match(/http\S+/)![0];
      const resetRedirect = await recovery.request(resetURL);
      const resetToken = new URL(
        resetRedirect.headers.get("location")!,
        baseURL,
      ).searchParams.get("token");
      const reset = await recovery.request("/api/auth/reset-password", {
        token: resetToken,
        newPassword: "A-different-test-password-825!",
      });
      expect(reset.status, await reset.clone().text()).toBe(200);
      expect(await (await actor.request("/api/auth/get-session")).json()).toBeNull();
      expect(
        (
          await recovery.request("/api/auth/reset-password", {
            token: resetToken,
            newPassword: password,
          })
        ).ok,
      ).toBe(false);
      await db
        .collection("platform_users")
        .updateOne({ _id: platform.insertedId }, { $set: { status: "deactivated" } });
      const disabledLogin = await recovery.request("/api/auth/sign-in/email", {
        email: invitedEmail,
        password: "A-different-test-password-825!",
      });
      expect(disabledLogin.ok).toBe(false);
      expect(await (await recovery.request("/api/auth/get-session")).json()).toBeNull();
      const stored = await db
        .collection("auth_two_factors")
        .findOne({ userId: new ObjectId(sessionBefore.user.id) });
      expect(stored?.secret).not.toContain(new URL(totpURI).searchParams.get("secret"));
    }, 60000);

    it("rejects expired or wrong invitations and rate-limits repeated sign-ins", async () => {
      const actor = browser("192.0.2.12");
      await client
        .db(databaseName)
        .collection("platform_users")
        .insertOne({
          normalizedEmail: "expired@example.test",
          displayName: "Expired",
          authUserId: "user_legacy_provider_fixture",
          status: "invited",
          invitation: {
            invitationId: invitationDigest("expired"),
            expiresAt: new Date(0),
            status: "pending",
          },
        });
      expect(
        (
          await actor.request(
            "/api/auth/sign-up/email",
            {
              email: "expired@example.test",
              name: "Expired",
              password: "A-long-password-298!",
            },
            { "x-invitation-token": "expired" },
          )
        ).status,
      ).toBe(403);
      let last: Response | undefined;
      for (let i = 0; i < 7; i++)
        last = await actor.request("/api/auth/sign-in/email", {
          email: "unknown@example.test",
          password: "not-a-real-password",
        });
      expect(last?.status).toBe(429);
    }, 30000);

    it("dry-runs and migrates legacy accounts without changing employee IDs, leave data or old audit history", async () => {
      const db = client.db(databaseName);
      const activeId = new ObjectId();
      const disabledId = new ObjectId();
      await db.collection("platform_users").insertMany([
        {
          _id: activeId,
          normalizedEmail: "legacy@example.test",
          role: "administrator",
          status: "active",
          authUserId: null,
          clerkUserId: "legacy-fixture",
          clerkSyncStatus: "synced",
          invitation: { clerkInvitationId: "old-invitation", status: "accepted" },
        },
        {
          _id: disabledId,
          normalizedEmail: "disabled@example.test",
          role: "collaborator",
          status: "deactivated",
          clerkUserId: "disabled-fixture",
        },
      ]);
      const employee = { _id: new ObjectId(), platformUserId: activeId };
      const leave = { _id: new ObjectId(), employeeId: employee._id, minutes: 480 };
      await db.collection("employees").insertOne(employee);
      await db.collection("pto_ledger").insertOne(leave);
      const before = await db.collection("platform_users").findOne({ _id: activeId });
      expect((await migrateLegacyAccounts(db, client)).candidates).toBe(2);
      expect(await db.collection("platform_users").findOne({ _id: activeId })).toEqual(
        before,
      );
      expect((await migrateLegacyAccounts(db, client, true)).migrated).toBe(2);
      expect(
        await db.collection("platform_users").findOne({ _id: activeId }),
      ).toMatchObject({
        authUserId: null,
        role: "administrator",
        status: "invited",
        clerkUserId: "legacy-fixture",
        invitation: { invitationId: null, clerkInvitationId: "old-invitation" },
      });
      expect(
        await db.collection("platform_users").findOne({ _id: disabledId }),
      ).toMatchObject({ status: "deactivated" });
      expect(await db.collection("employees").findOne({ _id: employee._id })).toEqual(
        employee,
      );
      expect(await db.collection("pto_ledger").findOne({ _id: leave._id })).toEqual(
        leave,
      );
      expect((await migrateLegacyAccounts(db, client, true)).migrated).toBe(0);
    });
  },
);
