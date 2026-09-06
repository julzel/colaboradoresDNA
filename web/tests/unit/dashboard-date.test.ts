import { describe, expect, it } from "vitest";

import { getDashboardDate } from "@/features/dashboard/domain/dashboard-date";

describe("dashboard date", () => {
  it("formats the date in Spanish using Costa Rica local time", () => {
    expect(getDashboardDate(new Date("2026-09-04T01:00:00.000Z"))).toEqual({
      iso: "2026-09-03",
      label: "Jueves, 3 de septiembre 2026",
    });
  });
});
