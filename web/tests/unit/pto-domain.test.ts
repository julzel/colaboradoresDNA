import { describe, expect, it } from "vitest";

import {
  canTransitionPtoStatus,
  daysToUnits,
  formatPtoDays,
  ptoAdjustmentDaysSchema,
  ptoDraftInputSchema,
  ptoDurationDaysSchema,
  ptoOpeningBalanceDaysSchema,
  ptoRangesOverlap,
  unitsToDays,
} from "@/features/pto/domain/pto";

describe("PTO domain", () => {
  it("stores day values as exact half-day units", () => {
    expect(daysToUnits(1.5)).toBe(3);
    expect(unitsToDays(3)).toBe(1.5);
    expect(formatPtoDays(-3)).toBe("-1,5");
    expect(ptoOpeningBalanceDaysSchema.parse("-1.5")).toBe(-3);
    expect(ptoAdjustmentDaysSchema.parse("0.5")).toBe(1);
    expect(ptoDurationDaysSchema.parse("0.5")).toBe(1);
  });

  it("rejects values outside half-day precision", () => {
    expect(ptoDurationDaysSchema.safeParse("0.25").success).toBe(false);
    expect(ptoDurationDaysSchema.safeParse("0").success).toBe(false);
    expect(ptoAdjustmentDaysSchema.safeParse("0").success).toBe(false);
    expect(ptoOpeningBalanceDaysSchema.safeParse("").success).toBe(false);
  });

  it("validates dates and duration without inferring allowance policy", () => {
    expect(
      ptoDraftInputSchema.safeParse({
        category: "vacation",
        collaboratorNote: "",
        durationUnits: 3,
        endDate: "2026-08-02",
        startDate: "2026-08-01",
      }).success,
    ).toBe(true);
    expect(
      ptoDraftInputSchema.safeParse({
        category: "vacation",
        collaboratorNote: "",
        durationUnits: 3,
        endDate: "2026-08-01",
        startDate: "2026-08-02",
      }).success,
    ).toBe(false);
  });

  it("detects inclusive overlaps", () => {
    expect(
      ptoRangesOverlap(
        { endDate: "2026-08-02", startDate: "2026-08-01" },
        { endDate: "2026-08-04", startDate: "2026-08-02" },
      ),
    ).toBe(true);
  });

  it("allows only the documented state transitions", () => {
    expect(canTransitionPtoStatus("draft", "pending")).toBe(true);
    expect(canTransitionPtoStatus("draft", "cancelled")).toBe(true);
    expect(canTransitionPtoStatus("pending", "approved")).toBe(true);
    expect(canTransitionPtoStatus("pending", "denied")).toBe(true);
    expect(canTransitionPtoStatus("pending", "cancelled")).toBe(true);
    expect(canTransitionPtoStatus("approved", "cancelled")).toBe(false);
    expect(canTransitionPtoStatus("draft", "approved")).toBe(false);
  });
});
