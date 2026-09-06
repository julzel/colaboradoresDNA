import { describe, expect, it } from "vitest";

import { formatEmployeeCode } from "@/features/employees/domain/employee";
import { productionWeekDraftInputSchema } from "@/features/production-tasks/domain/production-task";
import {
  addCalendarDays,
  getMondayForDate,
  normalizeProductionLookup,
} from "@/features/production-tasks/domain/shared";

describe("production task domain", () => {
  it("normalizes lookup values without using them as identity", () => {
    expect(normalizeProductionLookup("  CUARTO   FRÍO ")).toBe("cuarto frio");
  });

  it("calculates week boundaries deterministically", () => {
    expect(getMondayForDate("2026-09-03")).toBe("2026-08-31");
    expect(addCalendarDays("2026-08-31", 6)).toBe("2026-09-06");
  });

  it("rejects tasks outside the selected week", () => {
    const result = productionWeekDraftInputSchema.safeParse({
      expectedVersion: 1,
      planId: "507f1f77bcf86cd799439011",
      tasks: [
        {
          areaId: "507f1f77bcf86cd799439012",
          assigneeEmployeeIds: ["507f1f77bcf86cd799439013"],
          description: "Preparar producto",
          sortOrder: 0,
          subject: "DNA Pollo",
          workDate: "2026-09-07",
        },
      ],
      weekEnd: "2026-09-06",
      weekStart: "2026-08-31",
    });

    expect(result.success).toBe(false);
  });

  it("rejects duplicate persisted task identities", () => {
    const repeated = {
      areaId: "507f1f77bcf86cd799439012",
      assigneeEmployeeIds: ["507f1f77bcf86cd799439013"],
      description: "Preparar producto",
      id: "507f1f77bcf86cd799439014",
      sortOrder: 0,
      subject: "",
      workDate: "2026-09-01",
    };
    const result = productionWeekDraftInputSchema.safeParse({
      expectedVersion: 1,
      planId: "507f1f77bcf86cd799439011",
      tasks: [repeated, { ...repeated, sortOrder: 1 }],
      weekEnd: "2026-09-06",
      weekStart: "2026-08-31",
    });

    expect(result.success).toBe(false);
  });
});

describe("employee operational code", () => {
  it("keeps a fixed minimum width and supports future growth", () => {
    expect(formatEmployeeCode(42)).toBe("DNA-0042");
    expect(formatEmployeeCode(12_345)).toBe("DNA-12345");
  });
});
