// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ connect: vi.fn(), close: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("mongodb", () => ({
  ServerApiVersion: { v1: "1" },
  MongoClient: class {
    connect = mocks.connect;
    close = mocks.close;
  },
}));
import { getMongoClient } from "@/lib/server/mongodb";

describe("shared MongoDB connection", () => {
  beforeEach(() => {
    globalThis.mongoClientPromise = undefined;
    vi.stubEnv("MONGODB_URI", "mongodb://localhost:27017");
    vi.stubEnv("MONGODB_DB", "connection_test");
    mocks.connect.mockReset();
    mocks.close.mockReset().mockResolvedValue(undefined);
  });
  afterEach(() => {
    globalThis.mongoClientPromise = undefined;
    vi.unstubAllEnvs();
  });

  it("reuses one connection for concurrent callers", async () => {
    mocks.connect.mockResolvedValue({ connected: true });
    const [first, second] = await Promise.all([getMongoClient(), getMongoClient()]);
    expect(first).toBe(second);
    expect(mocks.connect).toHaveBeenCalledTimes(1);
  });

  it("closes a failed client and allows recovery on the next request", async () => {
    mocks.connect.mockRejectedValueOnce(new Error("Temporary outage"));
    await expect(getMongoClient()).rejects.toThrow("Temporary outage");
    expect(mocks.close).toHaveBeenCalledOnce();
    mocks.connect.mockResolvedValueOnce({ connected: true });
    await expect(getMongoClient()).resolves.toEqual({ connected: true });
    expect(mocks.connect).toHaveBeenCalledTimes(2);
  });
});
