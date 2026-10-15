import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { closeSync, openSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { createServer as createTcpServer, type AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { SMTPServer } from "smtp-server";

// All auth/database/mail settings override .env.local. Nothing leaves loopback.
const replica = await MongoMemoryReplSet.create({
  binary: { version: "8.0.12" },
  replSet: { count: 1, storageEngine: "wiredTiger" },
});
const temporaryDirectory = await mkdtemp(join(tmpdir(), "dna-auth-test-"));
const log = openSync(join(temporaryDirectory, "next.log"), "w");
const messages: Array<{ to: string[]; raw: string }> = [];
let failNextMail = false;
const smtp = new SMTPServer({
  disabledCommands: ["AUTH", "STARTTLS"],
  logger: false,
  onData(stream, session, callback) {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => {
      if (failNextMail) {
        failNextMail = false;
        callback(new Error("Synthetic SMTP failure"));
        return;
      }
      messages.push({
        to: session.envelope.rcptTo.map(({ address }) => address),
        raw: Buffer.concat(chunks).toString("utf8"),
      });
      callback();
    });
  },
});
const mailbox = createServer((request, response) => {
  if (request.method === "POST" && request.url === "/fail-next") {
    failNextMail = true;
    response.writeHead(204).end();
  } else {
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(messages));
  }
});
let app: ChildProcess | undefined;
function run(args: string[], environment: NodeJS.ProcessEnv) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: "inherit", env: environment });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Auth checks exited with code ${code}`));
    });
  });
}
try {
  const environment = {
    ...process.env,
    APP_ENVIRONMENT: "development",
    MONGODB_URI: replica.getUri(),
    MONGODB_DB: `local_auth_e2e_${randomBytes(8).toString("hex")}`,
    RUN_AUTH_LIVE: "1",
  };
  await run(
    [
      "node_modules/vitest/vitest.mjs",
      "run",
      "tests/integration/better-auth-mongodb.test.ts",
    ],
    environment,
  );
  if (!process.argv.includes("--integration-only")) {
    await new Promise<void>((resolve) => smtp.listen(0, "127.0.0.1", resolve));
    await new Promise<void>((resolve) => mailbox.listen(0, "127.0.0.1", resolve));
    const portReservation = createTcpServer();
    await new Promise<void>((resolve) =>
      portReservation.listen(0, "127.0.0.1", resolve),
    );
    const port = (portReservation.address() as AddressInfo).port;
    await new Promise<void>((resolve, reject) =>
      portReservation.close((error) => (error ? reject(error) : resolve())),
    );
    const baseURL = `http://127.0.0.1:${port}`;
    const browserEnvironment = {
      ...environment,
      APP_BASE_URL: baseURL,
      BETTER_AUTH_SECRET: randomBytes(32).toString("base64"),
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: String((smtp.server.address() as AddressInfo).port),
      SMTP_USER: "",
      SMTP_PASSWORD: "",
      AUTH_EMAIL_FROM: "Auth test <auth@example.test>",
      AUTH_TRUSTED_ORIGINS: "",
      BOOTSTRAP_ADMIN_IDENTITIES: "",
      E2E_BASE_URL: baseURL,
      RUN_AUTH_E2E: "1",
      AUTH_TEST_MAILBOX_URL: `http://127.0.0.1:${(mailbox.address() as AddressInfo).port}`,
    };
    app = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "dev",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      {
        env: browserEnvironment,
        stdio: ["ignore", log, log],
      },
    );
    app.on("error", () => {});
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt++) {
      if (app.exitCode !== null)
        throw new Error("Local auth app exited before startup");
      try {
        ready = (
          await fetch(`${baseURL}/sign-in`, { signal: AbortSignal.timeout(1000) })
        ).ok;
      } catch {
        /* The dev server is still starting. */
      }
      if (ready) break;
      await setTimeout(250);
    }
    if (!ready) throw new Error("Local auth app did not start");
    await run(
      [
        "node_modules/@playwright/test/cli.js",
        "test",
        "tests/e2e/password-recovery.spec.ts",
        "--workers=1",
      ],
      browserEnvironment,
    );
  }
} finally {
  if (app && app.exitCode === null) {
    const stopped = new Promise((resolve) => app!.once("exit", resolve));
    app.kill("SIGTERM");
    await stopped;
  }
  await new Promise<void>((resolve) => smtp.close(resolve));
  if (mailbox.listening)
    await new Promise<void>((resolve) => mailbox.close(() => resolve()));
  closeSync(log);
  await rm(temporaryDirectory, { recursive: true, force: true });
  await replica.stop();
}
