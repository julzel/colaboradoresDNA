import { randomBytes } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { MongoClient } from "mongodb";
import { invitationDigest } from "../../src/features/auth/server/auth-factory";
import { ensureAuthenticationSchema } from "../../src/features/auth/server/auth-schema";

test.describe("password recovery with isolated MongoDB and SMTP", () => {
  test.skip(process.env.RUN_AUTH_E2E !== "1", "Run with pnpm test:auth:local");
  test.describe.configure({ mode: "serial" });
  test.setTimeout(60000);
  let client: MongoClient;
  const email = "browser-recovery@example.test";
  const originalPassword = "Original-browser-password-719!";
  const newPassword = "Updated-browser-password-825!";
  const mailboxURL = process.env.AUTH_TEST_MAILBOX_URL!;
  const origin = process.env.E2E_BASE_URL!;

  async function mailLink(request: APIRequestContext, path: string) {
    const response = await request.get(mailboxURL);
    const messages = (await response.json()) as Array<{ to: string[]; raw: string }>;
    const text = messages
      .filter((mail) => mail.to.includes(email))
      .map(({ raw }) =>
        raw
          .replace(/=\r\n/g, "")
          .replace(/=([0-9a-f]{2})/gi, (_, hex: string) =>
            String.fromCharCode(parseInt(hex, 16)),
          ),
      )
      .findLast((raw) => raw.includes(path));
    const link = text?.match(/http[^\s<>]+/g)?.find((url) => url.includes(path));
    expect(link).toBeTruthy();
    return link!;
  }

  test.beforeAll(async ({ request }) => {
    if (!/^local_auth_e2e_[a-f0-9]{16}$/.test(process.env.MONGODB_DB ?? ""))
      throw new Error("An isolated local auth database is required");
    const uri = process.env.MONGODB_URI!;
    if (!uri.startsWith("mongodb://127.0.0.1:"))
      throw new Error("Loopback MongoDB is required");
    client = await new MongoClient(uri).connect();
    const database = client.db(process.env.MONGODB_DB);
    await ensureAuthenticationSchema(database);
    const invitation = randomBytes(32).toString("hex");
    await database.collection("platform_users").insertOne({
      normalizedEmail: email,
      displayName: "Browser recovery test",
      role: "collaborator",
      status: "invited",
      authUserId: null,
      authSyncStatus: "synced",
      createdAt: new Date(),
      updatedAt: new Date(),
      activatedAt: null,
      deactivatedAt: null,
      invitation: {
        invitationId: invitationDigest(invitation),
        status: "pending",
        expiresAt: new Date(Date.now() + 86400000),
        lastSentAt: new Date(),
      },
    });
    const signup = await request.post("/api/auth/sign-up/email", {
      headers: { origin, "x-invitation-token": invitation },
      data: { email, password: originalPassword, name: "Browser recovery test" },
    });
    expect(signup.status()).toBe(200);
    const verification = await request.get(await mailLink(request, "/verify-email"));
    expect(verification.ok()).toBe(true);
    // Recovery starts with an existing account that has already accepted its invite.
    const identity = await database.collection("auth_users").findOne({ email });
    await database.collection("platform_users").updateOne(
      { normalizedEmail: email },
      {
        $set: {
          authUserId: identity!._id.toHexString(),
          status: "active",
          activatedAt: new Date(),
          "invitation.status": "accepted",
        },
      },
    );
  });
  test.afterAll(async () => {
    await client?.close();
  });

  test("requests the email, follows its link, resets once and signs in with the new password", async ({
    page,
    request,
  }) => {
    await page.goto("/sign-in");
    await page.getByRole("button", { name: "Olvidé mi contraseña" }).click();
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByRole("button", { name: "Enviar enlace de recuperación" }).click();
    await expect(page.getByText(/Si la cuenta existe/)).toBeVisible();
    const link = await mailLink(request, "/reset-password/");
    expect(new URL(link).origin).toBe(origin);
    await page.goto(link);
    await expect(page).toHaveURL(/\/reset-password\?token=/);
    const resetPageURL = page.url();
    await page.getByLabel("Nueva contraseña").fill("short");
    await page.getByRole("button", { name: "Guardar contraseña" }).click();
    expect(
      await page
        .getByLabel("Nueva contraseña")
        .evaluate((input: HTMLInputElement) => input.validity.tooShort),
    ).toBe(true);
    await page.getByLabel("Nueva contraseña").fill(newPassword);
    await page.getByRole("button", { name: "Guardar contraseña" }).click();
    await expect(
      page.getByRole("heading", { name: "Contraseña actualizada" }),
    ).toBeVisible();
    await expect(page.getByLabel("Nueva contraseña")).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath("reset-success.png") });
    await page.getByRole("link", { name: "Iniciar sesión", exact: true }).click();
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(originalPassword);
    await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
    await expect(page.getByText(/No pudimos iniciar sesión/)).toBeVisible();
    await page.getByLabel("Contraseña", { exact: true }).fill(newPassword);
    await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
    await expect(page).toHaveURL(`${origin}/`);
    await expect(page.getByRole("heading", { name: "Hola, Browser" })).toBeVisible();
    const session = await page.request.get("/api/auth/get-session");
    expect((await session.json()).user.email).toBe(email);
    // Opening the consumed emailed link gets an error before presenting a form.
    await page.goto(link);
    await expect(
      page.getByRole("heading", { name: "Solicitá un enlace nuevo" }),
    ).toBeVisible();
    await expect(page.getByLabel("Nueva contraseña")).toHaveCount(0);
    // A form left open in another tab must also handle the consumed token.
    await page.goto(resetPageURL);
    await page.getByLabel("Nueva contraseña").fill(newPassword);
    await page.getByRole("button", { name: "Guardar contraseña" }).click();
    await expect(
      page.getByRole("heading", { name: "Solicitá un enlace nuevo" }),
    ).toBeVisible();
  });

  test("handles missing and expired links on mobile accessibly", async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    for (const url of ["/reset-password", "/reset-password?error=INVALID_TOKEN"]) {
      await page.goto(url);
      await expect(
        page.getByRole("heading", { name: "Solicitá un enlace nuevo" }),
      ).toBeVisible();
      await expect(page.getByLabel("Nueva contraseña")).toHaveCount(0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBe(true);
    }
    const response = await request.post("/api/auth/request-password-reset", {
      headers: { origin, "x-forwarded-for": "192.0.2.70" },
      data: { email, redirectTo: "/reset-password" },
    });
    expect(response.ok()).toBe(true);
    const link = await mailLink(request, "/reset-password/");
    const token = new URL(link).pathname.split("/").at(-1)!;
    await client
      .db(process.env.MONGODB_DB)
      .collection("auth_verifications")
      .updateOne(
        { identifier: `reset-password:${token}` },
        { $set: { expiresAt: new Date(Date.now() - 1000) } },
      );
    await page.goto(link);
    await expect(page).toHaveURL(/error=INVALID_TOKEN/);
    await expect(
      page.getByRole("heading", { name: "Solicitá un enlace nuevo" }),
    ).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath("reset-invalid-mobile.png"),
      fullPage: true,
    });
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.getByRole("link", { name: "Volver al inicio de sesión" }).click();
    await page.getByRole("button", { name: "Olvidé mi contraseña" }).click();
    await expect(
      page.getByRole("button", { name: "Enviar enlace de recuperación" }),
    ).toBeVisible();
  });

  test("shows SMTP and throttling failures without false success", async ({
    page,
    request,
  }) => {
    await page.setExtraHTTPHeaders({ "x-forwarded-for": "192.0.2.71" });
    await page.goto("/sign-in");
    await page.getByRole("button", { name: "Olvidé mi contraseña" }).click();
    await page.getByLabel("Correo electrónico").fill(email);
    await request.post(`${mailboxURL}/fail-next`);
    await page.getByRole("button", { name: "Enviar enlace de recuperación" }).click();
    await expect(
      page.getByText("No pudimos solicitar el enlace. Intentá de nuevo más tarde."),
    ).toBeVisible();
    await expect(page.getByText(/Si la cuenta existe/)).toHaveCount(0);
    await page.getByLabel("Correo electrónico").fill("unknown-browser@example.test");
    for (let i = 0; i < 2; i++) {
      await page.getByRole("button", { name: "Enviar enlace de recuperación" }).click();
      await expect(page.getByText(/Si la cuenta existe/)).toBeVisible();
    }
    await page.getByRole("button", { name: "Enviar enlace de recuperación" }).click();
    await expect(page.getByText(/Hiciste demasiados intentos/)).toBeVisible();
    await expect(page.getByText(/Si la cuenta existe/)).toHaveCount(0);
  });
});
