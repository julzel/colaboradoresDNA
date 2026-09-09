import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/internal/pto-accrual/route";
const accrue = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ month: "2026-10", credited: 2 }),
);
vi.mock("@/features/pto/server/pto-accrual", () => ({ accrueMonthlyPto: accrue }));
describe("scheduled accrual authorization", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });
  it.each([undefined, "", "short"])(
    "rejects absent or weak configured secrets",
    async (secret) => {
      vi.stubEnv("CRON_SECRET", secret);
      expect(
        (
          await POST(
            new Request("https://example.test/api/internal/pto-accrual", {
              method: "POST",
            }),
          )
        ).status,
      ).toBe(401);
      expect(accrue).not.toHaveBeenCalled();
    },
  );
  it("rejects wrong credentials and runs only with the scheduler credential", async () => {
    const secret = "synthetic-test-secret-not-for-production-123";
    vi.stubEnv("CRON_SECRET", secret);
    expect(
      (
        await POST(
          new Request("https://example.test/api/internal/pto-accrual", {
            method: "POST",
            headers: { authorization: "Bearer wrong" },
          }),
        )
      ).status,
    ).toBe(401);
    expect(accrue).not.toHaveBeenCalled();
    expect(
      (
        await POST(
          new Request("https://example.test/api/internal/pto-accrual", {
            method: "POST",
            headers: { authorization: `Bearer ${secret}` },
          }),
        )
      ).status,
    ).toBe(200);
    expect(accrue).toHaveBeenCalledOnce();
  });
});
