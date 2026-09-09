import { createHash } from "node:crypto";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { twoFactor } from "better-auth/plugins";
import { ObjectId, type Db, type MongoClient } from "mongodb";

export function invitationDigest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createAuthentication({
  database,
  client,
  baseURL,
  secret,
  sendMail,
}: {
  database: Db;
  client: MongoClient;
  baseURL: string;
  secret: string;
  sendMail: (message: { to: string; subject: string; text: string }) => Promise<void>;
}) {
  if (secret.length < 32)
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
  async function findSignupInvitation(email: string, token: string) {
    if (!email || !token || token.length > 256) return null;
    return database.collection("platform_users").findOne({
      normalizedEmail: email.toLowerCase(),
      status: "invited",
      authUserId: null,
      "invitation.invitationId": invitationDigest(token),
      "invitation.status": "pending",
      "invitation.expiresAt": { $gt: new Date() },
    });
  }
  return betterAuth({
    appName: "Colaboradores DNA",
    baseURL,
    secret,
    trustedOrigins: [new URL(baseURL).origin],
    database: mongodbAdapter(database, { client, transaction: true }),
    user: {
      modelName: "auth_users",
      deleteUser: { enabled: false },
      changeEmail: { enabled: false },
    },
    account: { modelName: "auth_accounts", accountLinking: { enabled: false } },
    verification: { modelName: "auth_verifications" },
    session: {
      modelName: "auth_sessions",
      expiresIn: 60 * 60 * 24,
      updateAge: 60 * 60,
      cookieCache: { enabled: false },
      additionalFields: {
        mfaVerified: { type: "boolean", defaultValue: false, input: false },
      },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) =>
        sendMail({
          to: user.email,
          subject: "Restablecer contraseña · Colaboradores DNA",
          text: `Usá este enlace para restablecer tu contraseña:\n${url}\nSi no lo solicitaste, ignorá este mensaje.`,
        }),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: false,
      expiresIn: 3600,
      sendVerificationEmail: async ({ user, url }) =>
        sendMail({
          to: user.email,
          subject: "Verificá tu correo · Colaboradores DNA",
          text: `Confirmá tu correo con este enlace:\n${url}`,
        }),
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "auth_rate_limits",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 3 },
        "/request-password-reset": { window: 60, max: 3 },
        "/send-verification-email": { window: 60, max: 3 },
      },
    },
    advanced: {
      disableOriginCheck: false,
      disableCSRFCheck: false,
      useSecureCookies: baseURL.startsWith("https:"),
      database: { generateId: false },
    },
    plugins: [
      twoFactor({
        issuer: "Colaboradores DNA",
        schema: { twoFactor: { modelName: "auth_two_factors" } },
      }),
    ],
    databaseHooks: {
      user: {
        create: {
          before: async (user, context) => {
            const token = context?.headers?.get("x-invitation-token") ?? "";
            const invitation = await findSignupInvitation(user.email, token);
            if (!token || !invitation)
              throw new APIError("FORBIDDEN", {
                message: "Necesitás una invitación vigente para registrarte.",
              });
            return { data: { ...user, name: invitation.displayName, image: null } };
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            const user = await database
              .collection("auth_users")
              .findOne({ _id: new ObjectId(session.userId) });
            const account =
              user &&
              (await database.collection("platform_users").findOne({
                normalizedEmail: user.email,
                status: { $in: ["invited", "active"] },
              }));
            if (
              !account ||
              (account.authUserId && account.authUserId !== session.userId)
            )
              return false;
            return { data: session };
          },
        },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (
          [
            "/two-factor/generate-backup-codes",
            "/two-factor/get-totp-uri",
            "/change-password",
          ].includes(ctx.path)
        ) {
          const current = await getSessionFromCtx(ctx);
          if (
            current &&
            "twoFactorEnabled" in current.user &&
            current.user.twoFactorEnabled &&
            !("mfaVerified" in current.session && current.session.mfaVerified)
          ) {
            throw new APIError("FORBIDDEN", {
              message:
                "Verificá tu segundo factor antes de modificar la seguridad de tu cuenta.",
            });
          }
        }
        if (ctx.path === "/sign-up/email") {
          const token = ctx.headers?.get("x-invitation-token") ?? "";
          const email =
            typeof ctx.body?.email === "string" ? ctx.body.email.toLowerCase() : "";
          const invitation = await findSignupInvitation(email, token);
          if (!invitation)
            throw new APIError("FORBIDDEN", {
              message: "Necesitás una invitación vigente para registrarte.",
            });
        }
        if (ctx.path.startsWith("/two-factor/") && ctx.body)
          ctx.body.trustDevice = false;
        if (ctx.path === "/two-factor/disable") {
          throw new APIError("FORBIDDEN", {
            message:
              "La verificación en dos pasos no se puede desactivar. Contactá a administración si perdiste acceso.",
          });
        }
        if (ctx.path === "/update-user")
          throw new APIError("FORBIDDEN", {
            message: "Actualizá tus datos desde Mi perfil.",
          });
      }),
      after: createAuthMiddleware(async (ctx) => {
        const result = ctx.context.returned;
        const verifiedSession = ctx.context.newSession ?? ctx.context.session;
        if (
          ["/two-factor/verify-totp", "/two-factor/verify-backup-code"].includes(
            ctx.path,
          ) &&
          result &&
          typeof result === "object" &&
          "token" in result &&
          verifiedSession
        ) {
          await ctx.context.internalAdapter.updateSession(
            verifiedSession.session.token,
            { mfaVerified: true },
          );
        }
      }),
    },
  });
}
