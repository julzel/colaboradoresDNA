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
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_fixture",
        CLERK_SECRET_KEY: "sk_live_fixture",
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
    { NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_fixture" },
    { CLERK_SECRET_KEY: "sk_test_fixture" },
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
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_fixture",
        CLERK_SECRET_KEY: "sk_test_fixture",
        MONGODB_DB: "colaboradores_dna_dev",
      }),
    ).not.toThrow();
  });
});
