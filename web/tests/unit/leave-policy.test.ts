import { describe, expect, it } from "vitest";
import { canCancelLeave } from "@/features/pto/domain/leave-policy";
import { getTodayInCostaRica } from "@/features/calendar/domain/calendar-utils";

describe("leave cancellation calendar policy", () => {
  it.each(["draft", "pending", "approved"])(
    "permits %s exactly two calendar days ahead",
    (status) => {
      expect(
        canCancelLeave({
          status,
          startDate: "2026-10-01",
          today: "2026-09-29",
          administrator: false,
        }),
      ).toBe(true);
      expect(
        canCancelLeave({
          status,
          startDate: "2026-10-01",
          today: "2026-09-30",
          administrator: false,
        }),
      ).toBe(false);
    },
  );
  it("allows an admin until the day before, but never once leave starts", () => {
    expect(
      canCancelLeave({
        status: "approved",
        startDate: "2026-10-01",
        today: "2026-09-30",
        administrator: true,
      }),
    ).toBe(true);
    expect(
      canCancelLeave({
        status: "approved",
        startDate: "2026-10-01",
        today: "2026-10-01",
        administrator: true,
      }),
    ).toBe(false);
    expect(
      canCancelLeave({
        status: "approved",
        startDate: "2026-09-30",
        today: "2026-10-01",
        administrator: true,
      }),
    ).toBe(false);
  });
  it.each(["cancelled", "denied"])("rejects terminal %s", (status) => {
    expect(
      canCancelLeave({
        status,
        startDate: "2027-01-01",
        today: "2026-09-01",
        administrator: true,
      }),
    ).toBe(false);
  });
  it("uses Costa Rica midnight, not UTC midnight", () => {
    expect(getTodayInCostaRica(new Date("2026-10-01T05:59:59Z"))).toBe("2026-09-30");
    expect(getTodayInCostaRica(new Date("2026-10-01T06:00:00Z"))).toBe("2026-10-01");
  });
});
