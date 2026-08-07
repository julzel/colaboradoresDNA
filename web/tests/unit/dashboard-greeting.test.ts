import { describe, expect, it } from "vitest";

import { getDashboardGreeting } from "@/features/dashboard/domain/dashboard-greeting";

describe("dashboard greeting", () => {
  it.each([
    ["2026-08-07T06:00:00.000Z", "¿Seguís despierto?", "late-night"],
    ["2026-08-07T11:00:00.000Z", "Buenos días", "morning"],
    ["2026-08-07T18:00:00.000Z", "Buenas tardes", "afternoon"],
    ["2026-08-08T00:00:00.000Z", "Buenas noches", "night"],
  ])("uses Costa Rica time for %s", (date, label, period) => {
    expect(getDashboardGreeting(new Date(date))).toEqual({ label, period });
  });
});
