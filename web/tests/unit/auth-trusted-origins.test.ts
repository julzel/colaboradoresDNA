// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getAuthenticationTrustedOrigins } from "@/features/auth/server/auth-factory";

describe("authentication trusted origins", () => {
  it("adds explicitly configured exact origins in development", () => {
    expect(
      getAuthenticationTrustedOrigins({
        baseURL: "http://localhost:3000",
        configuredOrigins: "http://192.168.100.13:3000, https://preview.example.test",
        environment: "development",
        nodeEnvironment: "development",
      }),
    ).toEqual([
      "http://localhost:3000",
      "http://192.168.100.13:3000",
      "https://preview.example.test",
    ]);
  });

  it("ignores extra origins in production", () => {
    expect(
      getAuthenticationTrustedOrigins({
        baseURL: "https://team.example.com",
        configuredOrigins: "http://192.168.100.13:3000",
        environment: "production",
        nodeEnvironment: "development",
      }),
    ).toEqual(["https://team.example.com"]);
  });

  it.each(["http://192.168.1.2:3000/path", "ftp://192.168.1.2"])(
    "rejects a non-origin value: %s",
    (configuredOrigins) => {
      expect(() =>
        getAuthenticationTrustedOrigins({
          baseURL: "http://localhost:3000",
          configuredOrigins,
          environment: "development",
          nodeEnvironment: "development",
        }),
      ).toThrow("exact HTTP(S) origins");
    },
  );
  it.each(["production", "test", undefined, "invalid"])(
    "ignores extra origins in the %s runtime even for a development app",
    (nodeEnvironment) => {
      expect(
        getAuthenticationTrustedOrigins({
          baseURL: "https://team.example.com",
          configuredOrigins: "http://192.168.100.13:3000",
          environment: "development",
          nodeEnvironment,
        }),
      ).toEqual(["https://team.example.com"]);
    },
  );
});
