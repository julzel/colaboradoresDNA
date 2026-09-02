import { describe, expect, it } from "vitest";

import type { ScheduleRecord } from "@/features/scheduling/domain/schedule";
import {
  buildOwnScheduleView,
  buildSchedulerDashboardView,
  buildSchedulerDetailView,
} from "@/features/scheduling/view-models/scheduler-view";

const weeklySchedule: ScheduleRecord = {
  anchorDate: "2026-08-31",
  effectiveFrom: "2026-08-31",
  effectiveTo: null,
  employeeId: "employee-1",
  id: "schedule-1",
  timezone: "America/Costa_Rica",
  version: 2,
  weeks: [
    {
      shifts: [
        { dayOfWeek: "tuesday", endTime: "16:30", startTime: "07:30" },
        { dayOfWeek: "saturday", endTime: "16:00", startTime: "08:00" },
      ],
    },
  ],
};

describe("scheduler dashboard view", () => {
  it("summarizes configured, alternating, and missing schedules", () => {
    const alternatingSchedule: ScheduleRecord = {
      ...weeklySchedule,
      employeeId: "employee-2",
      id: "schedule-2",
      weeks: [weeklySchedule.weeks[0], { shifts: [] }],
    };
    const view = buildSchedulerDashboardView(
      [
        { displayName: "Ana Mora", id: "employee-1", schedule: weeklySchedule },
        { displayName: "Luis Solano", id: "employee-2", schedule: alternatingSchedule },
        { displayName: "María Vega", id: "employee-3", schedule: null },
      ],
      "2026-09-02",
    );

    expect(view.counts).toEqual({
      alternating: 1,
      configured: 2,
      missing: 1,
      total: 3,
    });
    expect(view.items[0]).toMatchObject({
      effectiveLabel: "Desde 31 ago 2026",
      scheduleSummary: "2 días · 17 h por semana",
      status: "configured",
    });
    expect(view.items[0]?.weeks[0]?.days).toEqual(
      expect.arrayContaining([
        { dayLabel: "MAR", hoursLabel: "07:30–16:30", isWorkingDay: true },
        { dayLabel: "MIÉ", hoursLabel: null, isWorkingDay: false },
      ]),
    );
    expect(view.items[1]).toMatchObject({ status: "alternating" });
    expect(view.items[2]).toMatchObject({ status: "missing", weeks: [] });
  });

  it("prepares exact v2 shifts for the editor without exposing persistence fields", () => {
    const detail = buildSchedulerDetailView({
      currentSchedule: weeklySchedule,
      displayName: "Ana Mora",
      employeeId: "employee-1",
      history: [weeklySchedule],
      selectedDate: "2026-09-02",
    });

    expect(detail.editor).toMatchObject({
      anchorDate: "2026-08-31",
      cycle: "weekly",
      effectiveFrom: "2026-09-02",
      hasLegacyTimes: false,
    });
    expect(
      detail.editor.weeks[0]?.find((day) => day.dayOfWeek === "tuesday"),
    ).toMatchObject({ enabled: true, endTime: "16:30", startTime: "07:30" });
  });

  it("identifies the active week for a collaborator's alternating schedule", () => {
    const alternatingSchedule: ScheduleRecord = {
      ...weeklySchedule,
      weeks: [weeklySchedule.weeks[0], { shifts: [] }],
    };

    expect(buildOwnScheduleView(alternatingSchedule, "2026-09-07")).toMatchObject({
      activeWeekIndex: 1,
      scheduleSummary: "1 días · 8.5 h por semana",
      selectedDate: "2026-09-07",
      status: "alternating",
    });
    expect(buildOwnScheduleView(null, "2026-09-07")).toMatchObject({
      activeWeekIndex: null,
      status: "missing",
      weeks: [],
    });
  });
});
