// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/features/auth/server/require-platform-user", () => ({
  requirePlatformUser: vi.fn(),
}));
import { auth } from "@clerk/nextjs/server";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";
import { planningHttp, readJson } from "@/features/planning/http/handler";

beforeEach(() => {
  vi.mocked(auth).mockResolvedValue({ userId: "clerk-admin" } as Awaited<
    ReturnType<typeof auth>
  >);
  vi.mocked(requirePlatformUser).mockResolvedValue({
    platformUser: { id: "platform-admin", role: "administrator" },
  } as Awaited<ReturnType<typeof requirePlatformUser>>);
  vi.stubEnv("APP_BASE_URL", "http://localhost:3000");
});
describe("planning HTTP boundary", () => {
  it("returns private JSON and derives identity from authentication", async () => {
    const action = vi.fn().mockResolvedValue({ value: 1 });
    const response = await planningHttp(
      new Request("http://localhost:3000/api/planning/v1/workspace"),
      action,
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual({ data: { value: 1 } });
    expect(action).toHaveBeenCalledWith({
      id: "platform-admin",
      role: "administrator",
    });
    expect(requirePlatformUser).toHaveBeenCalledWith({ roles: ["administrator"] });
  });
  it("blocks cross-origin or missing-origin writes before invoking services", async () => {
    for (const origin of ["https://attacker.example", ""]) {
      const action = vi.fn();
      const response = await planningHttp(
        new Request("http://localhost:3000/api/planning/v1/proposals", {
          method: "POST",
          headers: { origin },
          body: "{}",
        }),
        action,
      );
      expect(response.status).toBe(403);
      expect(action).not.toHaveBeenCalled();
    }
  });
  it("returns 401 for signed-out callers and JSON 403 for auth redirects", async () => {
    const action = vi.fn();
    vi.mocked(auth).mockResolvedValueOnce({ userId: null } as Awaited<
      ReturnType<typeof auth>
    >);
    expect(
      (
        await planningHttp(
          new Request("http://localhost:3000/api/planning/v1/workspace"),
          action,
        )
      ).status,
    ).toBe(401);
    vi.mocked(requirePlatformUser).mockRejectedValueOnce({
      digest: "NEXT_REDIRECT;replace;/access-denied;307;",
    });
    expect(
      (
        await planningHttp(
          new Request("http://localhost:3000/api/planning/v1/workspace"),
          action,
        )
      ).status,
    ).toBe(403);
    expect(action).not.toHaveBeenCalled();
  });
  it("bounds actual body bytes and rejects malformed JSON", async () => {
    await expect(
      readJson(
        new Request("http://localhost", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "x".repeat(256001),
        }),
      ),
    ).rejects.toMatchObject({ status: 413 });
    await expect(
      readJson(
        new Request("http://localhost", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{",
        }),
      ),
    ).rejects.toMatchObject({ code: "invalid_json" });
  });
});
