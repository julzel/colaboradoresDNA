// @vitest-environment node
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

function verify(overrides: Record<string, string> = {}) {
  return () =>
    execFileSync(process.execPath, ["scripts/verify-netlify-preview.mjs"], {
      env: {
        NODE_ENV: "production",
        NETLIFY: "true",
        CONTEXT: "production",
        APP_ENVIRONMENT: "production",
        BETTER_AUTH_SECRET: "unit-test-only-secret-with-sufficient-length",
        SMTP_HOST: "smtp.example.com",
        SMTP_PORT: "587",
        AUTH_EMAIL_FROM: "DNA <auth@example.com>",
        MONGODB_URI: "mongodb+srv://fixture.example/",
        MONGODB_DB: "colaboradores_dna",
        APP_BASE_URL: "https://team.example.com",
        ...overrides,
      },
      stdio: "pipe",
    });
}

describe("deployment environment boundary", () => {
  it("accepts explicitly configured production", () => {
    expect(verify()).not.toThrow();
  });
  it.each([
    { CONTEXT: "deploy-preview" },
    { APP_ENVIRONMENT: "invalid" },
    { BETTER_AUTH_SECRET: "short" },
    { SMTP_HOST: "" },
    { SMTP_PORT: "not-a-port" },
    { SMTP_USER: "user" },
    { MONGODB_URI: "mongodb-invalid" },
    { MONGODB_DB: "colaboradores_dna_dev" },
    { APP_BASE_URL: "http://localhost:3000" },
    { APP_BASE_URL: "https://example.com/path" },
    { APP_BASE_URL: "" },
    { BOOTSTRAP_ADMIN_IDENTITIES: "[]" },
  ])("rejects unsafe production settings: %j", (overrides) => {
    expect(verify(overrides)).toThrow();
  });
  it("keeps development previews supported", () => {
    expect(
      verify({
        CONTEXT: "deploy-preview",
        APP_ENVIRONMENT: "development",
        MONGODB_DB: "colaboradores_dna_dev",
      }),
    ).not.toThrow();
  });
});
