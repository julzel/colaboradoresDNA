// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Next.js development origins", () => {
  it("loads local hostnames from the environment", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_DEV_ALLOWED_ORIGINS", "192.168.1.25, local.example.test, ");
    const { default: config } = await import("../../next.config");
    expect(config.allowedDevOrigins).toEqual(["192.168.1.25", "local.example.test"]);
  });

  it("has no machine-specific default", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_DEV_ALLOWED_ORIGINS", "");
    const { default: config } = await import("../../next.config");
    expect(config.allowedDevOrigins).toEqual([]);
  });

  it("ignores local hostnames in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ENVIRONMENT", "development");
    vi.stubEnv("NEXT_DEV_ALLOWED_ORIGINS", "192.168.1.25");
    const { default: config } = await import("../../next.config");
    expect(config.allowedDevOrigins).toEqual([]);
  });
});
