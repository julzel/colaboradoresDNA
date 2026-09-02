import { describe, expect, it } from "vitest";

import {
  COSTA_RICA_TIMEZONE,
  calculateAverageWeeklySchedule,
  calculateScheduleRange,
  getScheduleCycleWeekIndex,
  legacyScheduleV1RecordSchema,
  normalizeLegacyScheduleV1,
  resolveScheduleDate,
  scheduleV2InputSchema,
  scheduleV2RecordSchema,
  scheduleWriteInputSchema,
  SchedulingDomainError,
  type SchedulingDomainErrorCode,
} from "@/features/scheduling/domain/schedule";

const employeeId = "employee-1";
const actorId = "platform-user-1";

const weekA = {
  shifts: [
    { dayOfWeek: "monday", endTime: "17:00", startTime: "08:00" },
    { dayOfWeek: "tuesday", endTime: "17:00", startTime: "08:00" },
    { dayOfWeek: "wednesday", endTime: "17:00", startTime: "08:00" },
    { dayOfWeek: "thursday", endTime: "17:00", startTime: "08:00" },
    { dayOfWeek: "friday", endTime: "17:00", startTime: "08:00" },
    { dayOfWeek: "saturday", endTime: "17:00", startTime: "08:00" },
  ],
} as const;

const weekB = {
  shifts: [
    { dayOfWeek: "monday", endTime: "17:00", startTime: "08:00" },
    { dayOfWeek: "tuesday", endTime: "17:00", startTime: "08:00" },
    { dayOfWeek: "wednesday", endTime: "17:00", startTime: "08:00" },
    { dayOfWeek: "thursday", endTime: "17:00", startTime: "08:00" },
  ],
} as const;

function alternatingSchedule() {
  return scheduleV2RecordSchema.parse({
    anchorDate: "2026-08-31",
    effectiveFrom: "2026-08-31",
    effectiveTo: null,
    employeeId,
    id: "alternating-schedule",
    timezone: COSTA_RICA_TIMEZONE,
    version: 2,
    weeks: [weekA, weekB],
  });
}

function legacyDays() {
  return [
    { dayOfWeek: "monday", halfDayPeriod: null, workFraction: 1 },
    { dayOfWeek: "tuesday", halfDayPeriod: "morning", workFraction: 0.5 },
    { dayOfWeek: "wednesday", halfDayPeriod: null, workFraction: 0 },
    { dayOfWeek: "thursday", halfDayPeriod: null, workFraction: 0 },
    { dayOfWeek: "friday", halfDayPeriod: null, workFraction: 0 },
    { dayOfWeek: "saturday", halfDayPeriod: null, workFraction: 0 },
    { dayOfWeek: "sunday", halfDayPeriod: null, workFraction: 0 },
  ] as const;
}

function expectSchedulingError(
  operation: () => unknown,
  code: SchedulingDomainErrorCode,
) {
  try {
    operation();
    throw new Error("Expected a SchedulingDomainError.");
  } catch (error) {
    expect(error).toBeInstanceOf(SchedulingDomainError);
    expect((error as SchedulingDomainError).code).toBe(code);
    return error as SchedulingDomainError;
  }
}

describe("canonical v2 schedules", () => {
  it("accepts arbitrary weekdays and minute-precision consecutive shifts", () => {
    const result = scheduleV2InputSchema.parse({
      anchorDate: "2026-08-31",
      effectiveFrom: "2026-09-01",
      weeks: [
        {
          shifts: [
            {
              dayOfWeek: "saturday",
              endTime: "16:00",
              startTime: "08:00",
            },
            {
              dayOfWeek: "tuesday",
              endTime: "16:30",
              startTime: "07:30",
            },
            {
              dayOfWeek: "thursday",
              endTime: "16:30",
              startTime: "07:30",
            },
            {
              dayOfWeek: "friday",
              endTime: "12:30",
              startTime: "07:30",
            },
          ],
        },
      ],
    });

    expect(result).toMatchObject({
      effectiveTo: null,
      timezone: COSTA_RICA_TIMEZONE,
      version: 2,
    });
    expect(result.weeks[0].shifts.map((shift) => shift.dayOfWeek)).toEqual([
      "tuesday",
      "thursday",
      "friday",
      "saturday",
    ]);
  });

  it("keeps persistence metadata out of the business input and in the write command", () => {
    const input = scheduleV2InputSchema.parse({
      anchorDate: "2026-08-31",
      effectiveFrom: "2026-08-31",
      weeks: [weekB],
    });
    const write = scheduleWriteInputSchema.parse({
      ...input,
      createdByPlatformUserId: actorId,
      employeeId,
    });

    expect(input).not.toHaveProperty("employeeId");
    expect(write).toMatchObject({
      createdByPlatformUserId: actorId,
      employeeId,
      version: 2,
    });
    expect(write).not.toHaveProperty("id");
    expect(write).not.toHaveProperty("createdAt");
  });

  it("supports exactly one or two cycle weeks", () => {
    const base = {
      anchorDate: "2026-08-31",
      effectiveFrom: "2026-08-31",
    };

    expect(scheduleV2InputSchema.safeParse({ ...base, weeks: [weekA] }).success).toBe(
      true,
    );
    expect(
      scheduleV2InputSchema.safeParse({ ...base, weeks: [weekA, weekB] }).success,
    ).toBe(true);
    expect(scheduleV2InputSchema.safeParse({ ...base, weeks: [] }).success).toBe(false);
    expect(
      scheduleV2InputSchema.safeParse({
        ...base,
        weeks: [weekA, weekB, weekA],
      }).success,
    ).toBe(false);
    expect(
      scheduleV2InputSchema.safeParse({
        ...base,
        weeks: [weekA, { shifts: [] }],
      }).success,
    ).toBe(true);
    expect(
      scheduleV2InputSchema.safeParse({
        ...base,
        weeks: [{ shifts: [] }, { shifts: [] }],
      }).success,
    ).toBe(false);
  });

  it("requires a Monday anchor and a valid effective range", () => {
    expect(
      scheduleV2InputSchema.safeParse({
        anchorDate: "2026-09-01",
        effectiveFrom: "2026-09-01",
        weeks: [weekA],
      }).success,
    ).toBe(false);
    expect(
      scheduleV2InputSchema.safeParse({
        anchorDate: "2026-08-31",
        effectiveFrom: "2026-09-02",
        effectiveTo: "2026-09-01",
        weeks: [weekA],
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate weekdays, overnight shifts, and noncanonical clock values", () => {
    const base = {
      anchorDate: "2026-08-31",
      effectiveFrom: "2026-08-31",
    };

    expect(
      scheduleV2InputSchema.safeParse({
        ...base,
        weeks: [
          {
            shifts: [
              { dayOfWeek: "monday", endTime: "12:00", startTime: "08:00" },
              { dayOfWeek: "monday", endTime: "17:00", startTime: "13:00" },
            ],
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      scheduleV2InputSchema.safeParse({
        ...base,
        weeks: [
          {
            shifts: [{ dayOfWeek: "monday", endTime: "07:30", startTime: "16:30" }],
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      scheduleV2InputSchema.safeParse({
        ...base,
        weeks: [
          {
            shifts: [{ dayOfWeek: "monday", endTime: "16:30", startTime: "7:30" }],
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      scheduleV2InputSchema.safeParse({
        ...base,
        weeks: [
          {
            shifts: [
              {
                dayOfWeek: "monday",
                endTime: "16:30:00",
                startTime: "07:30:00",
              },
            ],
          },
        ],
      }).success,
    ).toBe(false);
  });
});

describe("schedule date resolution and totals", () => {
  it("resolves alternating weeks from the explicit Monday anchor", () => {
    const schedule = alternatingSchedule();

    expect(getScheduleCycleWeekIndex(schedule, "2026-08-31")).toBe(0);
    expect(getScheduleCycleWeekIndex(schedule, "2026-09-07")).toBe(1);
    expect(getScheduleCycleWeekIndex(schedule, "2026-09-14")).toBe(0);
    expect(resolveScheduleDate(schedule, "2026-09-05")).toMatchObject({
      cycleWeekIndex: 0,
      isWorkingDay: true,
      scheduledMinutes: 540,
      startTime: "08:00",
    });
    expect(resolveScheduleDate(schedule, "2026-09-12")).toMatchObject({
      cycleWeekIndex: 1,
      isWorkingDay: false,
      scheduledMinutes: 0,
    });
  });

  it("keeps cycle parity before the anchor and across a year boundary", () => {
    const schedule = scheduleV2RecordSchema.parse({
      ...alternatingSchedule(),
      anchorDate: "2026-12-28",
      effectiveFrom: "2026-12-01",
    });

    expect(getScheduleCycleWeekIndex(schedule, "2026-12-21")).toBe(1);
    expect(getScheduleCycleWeekIndex(schedule, "2026-12-28")).toBe(0);
    expect(getScheduleCycleWeekIndex(schedule, "2027-01-04")).toBe(1);
  });

  it("calculates average weekly days and minutes across a two-week cycle", () => {
    expect(calculateAverageWeeklySchedule(alternatingSchedule())).toEqual({
      averageScheduledMinutes: 2_700,
      averageWorkingDayCount: 5,
      cycleWeekCount: 2,
    });
  });

  it.each([
    {
      expectedMinutes: 2_640,
      expectedWorkingDays: 5,
      id: "collaborator-1",
      shifts: [
        { dayOfWeek: "tuesday", endTime: "16:30", startTime: "07:30" },
        { dayOfWeek: "wednesday", endTime: "16:30", startTime: "07:30" },
        { dayOfWeek: "thursday", endTime: "16:30", startTime: "07:30" },
        { dayOfWeek: "friday", endTime: "16:30", startTime: "07:30" },
        { dayOfWeek: "saturday", endTime: "16:00", startTime: "08:00" },
      ],
    },
    {
      expectedMinutes: 1_860,
      expectedWorkingDays: 4,
      id: "collaborator-2",
      shifts: [
        { dayOfWeek: "tuesday", endTime: "16:30", startTime: "07:30" },
        { dayOfWeek: "thursday", endTime: "16:30", startTime: "07:30" },
        { dayOfWeek: "friday", endTime: "12:30", startTime: "07:30" },
        { dayOfWeek: "saturday", endTime: "16:00", startTime: "08:00" },
      ],
    },
  ] as const)("calculates the requested $id variable-day schedule", (example) => {
    const schedule = scheduleV2RecordSchema.parse({
      anchorDate: "2026-08-31",
      effectiveFrom: "2026-08-31",
      effectiveTo: null,
      employeeId: example.id,
      id: `${example.id}-schedule`,
      timezone: COSTA_RICA_TIMEZONE,
      version: 2,
      weeks: [{ shifts: example.shifts }],
    });

    expect(calculateAverageWeeklySchedule(schedule)).toEqual({
      averageScheduledMinutes: example.expectedMinutes,
      averageWorkingDayCount: example.expectedWorkingDays,
      cycleWeekCount: 1,
    });
  });

  it("counts a short scheduled date as one working day", () => {
    const schedule = scheduleV2RecordSchema.parse({
      anchorDate: "2026-08-31",
      effectiveFrom: "2026-08-31",
      effectiveTo: "2026-08-31",
      employeeId,
      id: "short-shift",
      timezone: COSTA_RICA_TIMEZONE,
      version: 2,
      weeks: [
        {
          shifts: [{ dayOfWeek: "monday", endTime: "12:30", startTime: "07:30" }],
        },
      ],
    });

    expect(
      calculateScheduleRange([schedule], "2026-08-31", "2026-08-31"),
    ).toMatchObject({
      totalScheduledMinutes: 300,
      workingDates: ["2026-08-31"],
      workingDayCount: 1,
    });
  });
});

describe("legacy v1 compatibility", () => {
  it("normalizes an unversioned record into the explicit v1 union member", () => {
    const schedule = normalizeLegacyScheduleV1({
      days: legacyDays(),
      effectiveFrom: "2026-08-31",
      effectiveTo: null,
      employeeId,
      id: "legacy-schedule",
      timezone: COSTA_RICA_TIMEZONE,
    });

    expect(schedule.version).toBe(1);
    expect(legacyScheduleV1RecordSchema.parse(schedule)).toEqual(schedule);
  });

  it("reports v1 full and half days without fabricating clock times", () => {
    const schedule = normalizeLegacyScheduleV1({
      days: legacyDays(),
      effectiveFrom: "2026-08-31",
      effectiveTo: null,
      employeeId,
      id: "legacy-schedule",
    });

    expect(resolveScheduleDate(schedule, "2026-08-31")).toMatchObject({
      clockTimeKnown: false,
      endTime: null,
      isWorkingDay: true,
      scheduledMinutes: 480,
      startTime: null,
    });
    expect(resolveScheduleDate(schedule, "2026-09-01")).toMatchObject({
      clockTimeKnown: false,
      endTime: null,
      isWorkingDay: true,
      legacyHalfDayPeriod: "morning",
      scheduledMinutes: 240,
      startTime: null,
    });
    expect(calculateAverageWeeklySchedule(schedule)).toEqual({
      averageScheduledMinutes: 720,
      averageWorkingDayCount: 2,
      cycleWeekCount: 1,
    });
  });
});

describe("inclusive effective schedule ranges", () => {
  function mixedSchedules() {
    const legacy = normalizeLegacyScheduleV1({
      days: legacyDays(),
      effectiveFrom: "2026-08-31",
      effectiveTo: "2026-09-01",
      employeeId,
      id: "legacy-schedule",
    });
    const current = scheduleV2RecordSchema.parse({
      anchorDate: "2026-08-31",
      effectiveFrom: "2026-09-02",
      effectiveTo: "2026-09-06",
      employeeId,
      id: "current-schedule",
      timezone: COSTA_RICA_TIMEZONE,
      version: 2,
      weeks: [
        {
          shifts: [
            {
              dayOfWeek: "wednesday",
              endTime: "12:30",
              startTime: "07:30",
            },
            {
              dayOfWeek: "saturday",
              endTime: "16:00",
              startTime: "08:00",
            },
          ],
        },
      ],
    });

    return { current, legacy };
  }

  it("calculates every calendar date across adjacent mixed v1 and v2 records", () => {
    const { current, legacy } = mixedSchedules();
    const result = calculateScheduleRange(
      [current, legacy],
      "2026-08-31",
      "2026-09-06",
    );

    expect(result.workingDates).toEqual([
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
      "2026-09-05",
    ]);
    expect(result.workingDayCount).toBe(4);
    expect(result.totalScheduledMinutes).toBe(1_500);
    expect(result.sourceScheduleIds).toEqual(["legacy-schedule", "current-schedule"]);
    expect(result.dateBreakdown).toHaveLength(7);
    expect(result.dateBreakdown[3]).toMatchObject({
      date: "2026-09-03",
      isWorkingDay: false,
      scheduledMinutes: 0,
      sourceScheduleId: "current-schedule",
    });
  });

  it("uses typed deterministic errors for invalid ranges", () => {
    const error = expectSchedulingError(
      () => calculateScheduleRange([], "2026-09-02", "2026-09-01"),
      "invalid_range",
    );

    expect(error.details).toEqual({
      date: null,
      endDate: "2026-09-01",
      sourceScheduleIds: [],
      startDate: "2026-09-02",
    });
    expectSchedulingError(
      () => calculateScheduleRange([], "2026-02-30", "2026-03-01"),
      "invalid_range",
    );
    expectSchedulingError(
      () => calculateScheduleRange([], "2026-01-01", "2037-01-01"),
      "invalid_range",
    );
  });

  it("fails on the first uncovered calendar date, including a non-working date", () => {
    const { current, legacy } = mixedSchedules();
    const scheduleWithGap = scheduleV2RecordSchema.parse({
      ...current,
      effectiveFrom: "2026-09-03",
    });
    const error = expectSchedulingError(
      () =>
        calculateScheduleRange([scheduleWithGap, legacy], "2026-08-31", "2026-09-06"),
      "coverage_gap",
    );

    expect(error.details.date).toBe("2026-09-02");
  });

  it("rejects ambiguous overlapping effective records deterministically", () => {
    const first = alternatingSchedule();
    const second = scheduleV2RecordSchema.parse({
      ...first,
      id: "another-schedule",
    });
    const error = expectSchedulingError(
      () => calculateScheduleRange([first, second], "2026-08-31", "2026-08-31"),
      "overlapping_schedule_coverage",
    );

    expect(error.details).toMatchObject({
      date: "2026-08-31",
      sourceScheduleIds: ["alternating-schedule", "another-schedule"],
    });
  });
});
