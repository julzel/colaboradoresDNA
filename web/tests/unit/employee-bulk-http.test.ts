// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  employeeBulkHttp,
  readEmployeeImportBody,
} from "@/features/employees/http/bulk-handler";
import { MAX_IMPORT_BYTES } from "@/features/employees/domain/employee-csv";

const mocks = vi.hoisted(() => ({ identity: vi.fn(), auth: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/features/auth/server/auth-provider", () => ({
  getIdentitySession: mocks.identity,
}));
vi.mock("@/features/auth/server/require-platform-user", () => ({
  requirePlatformUser: mocks.auth,
}));

describe("employee bulk HTTP boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("APP_BASE_URL", "http://localhost:3000");
    mocks.identity.mockResolvedValue({ user: { id: "identity" } });
    mocks.auth.mockResolvedValue({ platformUser: { id: "actor" } });
  });
  it("rejects anonymous downloads", async () => {
    mocks.identity.mockResolvedValue(null);
    const handler = vi.fn();
    const response = await employeeBulkHttp(
      new Request("http://localhost:3000/api/employees/bulk"),
      handler,
    );
    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });
  it("turns role/MFA redirects into forbidden JSON responses", async () => {
    mocks.auth.mockRejectedValue({ digest: "NEXT_REDIRECT;replace;/account" });
    const handler = vi.fn();
    const response = await employeeBulkHttp(
      new Request("http://localhost:3000/api/employees/bulk"),
      handler,
    );
    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });
  it.each([null, "https://evil.example"])("rejects POST origin %s", async (origin) => {
    const handler = vi.fn();
    const response = await employeeBulkHttp(
      new Request("http://localhost:3000/api/employees/bulk", {
        method: "POST",
        headers: origin ? { origin } : {},
      }),
      handler,
    );
    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });
  it("allows same-origin administrators and disables caching", async () => {
    const response = await employeeBulkHttp(
      new Request("http://localhost:3000/api/employees/bulk", {
        method: "POST",
        headers: { origin: "http://localhost:3000" },
      }),
      async () => ({ canImport: false }),
    );
    expect(response.status).toBe(200);
    expect(mocks.auth).toHaveBeenCalledWith({ roles: ["administrator"] });
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("limits real bytes even without a content-length header", async () => {
    const request = new Request("http://localhost:3000", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ csv: "a".repeat(MAX_IMPORT_BYTES * 3), mode: "validate" }),
    });
    await expect(readEmployeeImportBody(request)).rejects.toThrow("grande");
  });
  it("rejects extra JSON fields and invalid mode", async () => {
    const request = new Request("http://localhost:3000", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ csv: "a", mode: "overwrite", actor: "spoofed" }),
    });
    await expect(readEmployeeImportBody(request)).rejects.toThrow();
  });
});
