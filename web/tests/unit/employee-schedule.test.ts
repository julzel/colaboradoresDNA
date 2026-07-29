import { describe, expect, it } from "vitest";

import { employeeAssignmentInputSchema } from "@/features/employees/domain/assignment";
import {
  calculateWeeklySchedule,
  dayOfWeekOrder,
  employeeScheduleInputSchema,
  type ScheduledDay,
  type WorkFraction,
} from "@/features/employees/domain/schedule";

const employeeId = "507f1f77bcf86cd799439011";
const departmentId = "507f1f77bcf86cd799439012";
const actorId = "507f1f77bcf86cd799439013";

function createDays(fractions: readonly WorkFraction[]): ScheduledDay[] {
  return dayOfWeekOrder.map((dayOfWeek, index) => {
    const workFraction = fractions[index] ?? 0;

    return {
      dayOfWeek,
      halfDayPeriod: workFraction === 0.5 ? "morning" : null,
      workFraction,
    };
  });
}

function validSchedule(days = createDays([1, 1, 1, 1, 1, 0, 0])) {
  return {
    createdByPlatformUserId: actorId,
    days,
    effectiveFrom: "2026-08-01",
    effectiveTo: null,
    employeeId,
  };
}

describe("weekly employee schedule", () => {
  it("derives 28 hours from 3.5 scheduled days", () => {
    const schedule = employeeScheduleInputSchema.parse(
      validSchedule(createDays([1, 1, 1, 0.5, 0, 0, 0])),
    );

    expect(calculateWeeklySchedule(schedule.days)).toEqual({
      weeklyScheduledDays: 3.5,
      weeklyScheduledHours: 28,
    });
  });

  it("derives 40 hours from 5 scheduled days", () => {
    const schedule = employeeScheduleInputSchema.parse(validSchedule());

    expect(calculateWeeklySchedule(schedule.days)).toEqual({
      weeklyScheduledDays: 5,
      weeklyScheduledHours: 40,
    });
  });

  it("counts a half-day as four hours and requires its period", () => {
    expect(calculateWeeklySchedule(createDays([0.5, 0, 0, 0, 0, 0, 0]))).toEqual({
      weeklyScheduledDays: 0.5,
      weeklyScheduledHours: 4,
    });

    const days = createDays([0.5, 0, 0, 0, 0, 0, 0]);
    days[0] = { ...days[0]!, halfDayPeriod: null };
    expect(employeeScheduleInputSchema.safeParse(validSchedule(days)).success).toBe(
      false,
    );
  });

  it("rejects a half-day period on a full or non-working day", () => {
    const days = createDays([1, 0, 0, 0, 0, 0, 0]);
    days[0] = { ...days[0]!, halfDayPeriod: "afternoon" };

    expect(employeeScheduleInputSchema.safeParse(validSchedule(days)).success).toBe(
      false,
    );
  });

  it("requires all seven weekdays exactly once", () => {
    const days = createDays([1, 1, 1, 1, 1, 0, 0]);
    days[6] = { ...days[6]!, dayOfWeek: "monday" };

    expect(employeeScheduleInputSchema.safeParse(validSchedule(days)).success).toBe(
      false,
    );
  });

  it("rejects a schedule with no work periods", () => {
    expect(
      employeeScheduleInputSchema.safeParse(
        validSchedule(createDays([0, 0, 0, 0, 0, 0, 0])),
      ).success,
    ).toBe(false);
  });

  it("sorts valid weekdays into a stable canonical order", () => {
    const reversed = [...createDays([1, 1, 1, 1, 1, 0, 0])].reverse();
    const schedule = employeeScheduleInputSchema.parse(validSchedule(reversed));

    expect(schedule.days.map((day) => day.dayOfWeek)).toEqual(dayOfWeekOrder);
    expect(schedule.timezone).toBe("America/Costa_Rica");
  });

  it("rejects an effective end date before the start date", () => {
    expect(
      employeeScheduleInputSchema.safeParse({
        ...validSchedule(),
        effectiveTo: "2026-07-31",
      }).success,
    ).toBe(false);
  });
});

describe("employee assignment", () => {
  it("normalizes a free-text position title", () => {
    const assignment = employeeAssignmentInputSchema.parse({
      createdByPlatformUserId: actorId,
      departmentId,
      effectiveFrom: "2026-08-01",
      employeeId,
      managerEmployeeId: null,
      positionTitle: "  Especialista   de nutrición ",
    });

    expect(assignment.positionTitle).toBe("Especialista de nutrición");
  });

  it("rejects a self-reporting relationship", () => {
    expect(
      employeeAssignmentInputSchema.safeParse({
        createdByPlatformUserId: actorId,
        departmentId,
        effectiveFrom: "2026-08-01",
        employeeId,
        managerEmployeeId: employeeId,
        positionTitle: "Operaciones",
      }).success,
    ).toBe(false);
  });

  it("rejects an effective end date before the start date", () => {
    expect(
      employeeAssignmentInputSchema.safeParse({
        createdByPlatformUserId: actorId,
        departmentId,
        effectiveFrom: "2026-08-01",
        effectiveTo: "2026-07-31",
        employeeId,
        managerEmployeeId: null,
        positionTitle: "Operaciones",
      }).success,
    ).toBe(false);
  });
});
