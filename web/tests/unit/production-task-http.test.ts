// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  productionTaskHttp,
  readTaskBody,
} from "@/features/production-tasks/http/handler";
import { ProductionTaskDomainError } from "@/features/production-tasks/domain/shared";
const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  auth: vi.fn(),
  manager: vi.fn(),
  preview: vi.fn(),
  board: vi.fn(),
  publish: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/features/auth/server/auth-provider", () => ({
  getIdentitySession: mocks.session,
}));
vi.mock("@/features/auth/server/require-platform-user", () => ({
  requirePlatformUser: mocks.auth,
}));
vi.mock("@/features/production-tasks/server/production-task-application", () => ({
  getProductionTaskManagementAccess: mocks.manager,
  createProductionImportPreview: mocks.preview,
  getPublishedProductionBoard: mocks.board,
  publishProductionWeekAsManager: mocks.publish,
}));
const origin = "https://tasks.invalid";
const request = (path: string, body: string, headers = {}) =>
  new Request(`${origin}/api/production-tasks/v1/${path}`, {
    method: "POST",
    headers: { origin, "content-type": "application/json", ...headers },
    body,
  });
describe("production tasks HTTP boundary", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("APP_BASE_URL", origin);
    mocks.session.mockResolvedValue({});
    mocks.auth.mockResolvedValue({});
    mocks.manager.mockResolvedValue({});
  });
  it("returns JSON 401 for unauthenticated API callers", async () => {
    mocks.session.mockResolvedValue(null);
    const response = await productionTaskHttp(
      new Request(`${origin}/api/production-tasks/v1/board`),
      ["board"],
    );
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.board).not.toHaveBeenCalled();
  });
  it("rejects cross-origin commands before parsing files", async () => {
    const response = await productionTaskHttp(
      request("imports", "data", { origin: "https://other.invalid" }),
      ["imports"],
    );
    expect(response.status).toBe(403);
    expect(mocks.preview).not.toHaveBeenCalled();
  });
  it("authorizes managers before reading upload contents", async () => {
    mocks.manager.mockRejectedValue(new ProductionTaskDomainError("forbidden"));
    const response = await productionTaskHttp(
      request("imports?filename=file.csv", "content"),
      ["imports"],
    );
    expect(response.status).toBe(403);
    expect(mocks.preview).not.toHaveBeenCalled();
  });
  it("bounds actual streamed bytes, not just Content-Length", async () => {
    await expect(readTaskBody(request("imports", "123456"), 5)).rejects.toMatchObject({
      code: "file_too_large",
    });
  });
  it("passes CSV bytes and filename to the core", async () => {
    mocks.preview.mockResolvedValue({ id: "preview" });
    const response = await productionTaskHttp(
      request("imports?filename=file.csv", "content"),
      ["imports"],
    );
    expect(response.status).toBe(201);
    expect(mocks.preview).toHaveBeenCalledWith(
      expect.objectContaining({ buffer: Buffer.from("content"), fileName: "file.csv" }),
    );
  });
  it("requires explicit publication confirmation and a positive expected version", async () => {
    const response = await productionTaskHttp(
      request(
        "publish",
        JSON.stringify({
          planId: "507f1f77bcf86cd799439011",
          expectedVersion: 1,
          acknowledgeWarnings: true,
          confirmed: false,
        }),
      ),
      ["publish"],
    );
    expect(response.status).toBe(400);
    expect(mocks.publish).not.toHaveBeenCalled();
  });
  it("returns safe conflict messages, without service internals", async () => {
    mocks.publish.mockRejectedValue(new ProductionTaskDomainError("stale_version"));
    const response = await productionTaskHttp(
      request(
        "publish",
        JSON.stringify({
          planId: "507f1f77bcf86cd799439011",
          expectedVersion: 1,
          acknowledgeWarnings: true,
          confirmed: true,
        }),
      ),
      ["publish"],
    );
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("stale_version");
  });
});
