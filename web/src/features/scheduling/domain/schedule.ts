import { z } from "zod";

export const COSTA_RICA_TIMEZONE = "America/Costa_Rica" as const;

export const scheduleDayOfWeekOrder = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export const scheduleDayOfWeekSchema = z.enum(scheduleDayOfWeekOrder);
export type ScheduleDayOfWeek = z.infer<typeof scheduleDayOfWeekSchema>;

const ISO_CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const CLOCK_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const MILLISECONDS_PER_DAY = 86_400_000;
export const MAX_SCHEDULE_CALCULATION_DAYS = 3_660;

export function isValidScheduleDate(value: string) {
  const match = ISO_CALENDAR_DATE_PATTERN.exec(value);

  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export const scheduleDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use an ISO calendar date (YYYY-MM-DD).")
  .refine(isValidScheduleDate, "Use a valid calendar date.");

export const scheduleClockTimeSchema = z
  .string()
  .regex(CLOCK_TIME_PATTERN, "Use a 24-hour clock time with minute precision (HH:mm).");

export type ScheduleClockTime = z.infer<typeof scheduleClockTimeSchema>;

function calendarDateToUtc(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function dayOfWeekForDate(value: string): ScheduleDayOfWeek {
  const sundayBasedDay = calendarDateToUtc(value).getUTCDay();
  const mondayBasedDay = (sundayBasedDay + 6) % 7;
  return scheduleDayOfWeekOrder[mondayBasedDay]!;
}

function minutesFromClockTime(value: ScheduleClockTime) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours! * 60 + minutes!;
}

function scheduledMinutesBetween(
  startTime: ScheduleClockTime,
  endTime: ScheduleClockTime,
) {
  return minutesFromClockTime(endTime) - minutesFromClockTime(startTime);
}

export const scheduleShiftSchema = z
  .object({
    dayOfWeek: scheduleDayOfWeekSchema,
    endTime: scheduleClockTimeSchema,
    startTime: scheduleClockTimeSchema,
  })
  .superRefine((shift, context) => {
    if (shift.startTime >= shift.endTime) {
      context.addIssue({
        code: "custom",
        message: "The end time must be later than the start time on the same day.",
        path: ["endTime"],
      });
    }
  });

export type ScheduleShift = z.output<typeof scheduleShiftSchema>;

export const scheduleWeekSchema = z
  .object({
    shifts: z.array(scheduleShiftSchema).max(7),
  })
  .superRefine((week, context) => {
    const seenDays = new Set<ScheduleDayOfWeek>();

    week.shifts.forEach((shift, index) => {
      if (seenDays.has(shift.dayOfWeek)) {
        context.addIssue({
          code: "custom",
          message: "A weekday can only have one consecutive shift per cycle week.",
          path: ["shifts", index, "dayOfWeek"],
        });
      }

      seenDays.add(shift.dayOfWeek);
    });
  })
  .transform((week) => ({
    shifts: [...week.shifts].sort(
      (first, second) =>
        scheduleDayOfWeekOrder.indexOf(first.dayOfWeek) -
        scheduleDayOfWeekOrder.indexOf(second.dayOfWeek),
    ),
  }));

export type ScheduleWeek = z.output<typeof scheduleWeekSchema>;

const scheduleWeeksSchema = z.union([
  z.tuple([scheduleWeekSchema]),
  z.tuple([scheduleWeekSchema, scheduleWeekSchema]),
]);

const scheduleV2CommonFields = {
  anchorDate: scheduleDateSchema.refine(
    (value) => dayOfWeekForDate(value) === "monday",
    "The cycle anchor date must be a Monday.",
  ),
  effectiveFrom: scheduleDateSchema,
  effectiveTo: scheduleDateSchema.nullish().default(null),
  timezone: z.literal(COSTA_RICA_TIMEZONE).default(COSTA_RICA_TIMEZONE),
  weeks: scheduleWeeksSchema,
};

function validateEffectiveDateRange(
  value: { effectiveFrom: string; effectiveTo: string | null },
  context: z.RefinementCtx,
) {
  if (value.effectiveTo !== null && value.effectiveTo < value.effectiveFrom) {
    context.addIssue({
      code: "custom",
      message: "The effective end date cannot be earlier than the start date.",
      path: ["effectiveTo"],
    });
  }
}

function validateScheduleV2(
  value: {
    effectiveFrom: string;
    effectiveTo: string | null;
    weeks: readonly ScheduleWeek[];
  },
  context: z.RefinementCtx,
) {
  validateEffectiveDateRange(value, context);

  if (value.weeks.every((week) => week.shifts.length === 0)) {
    context.addIssue({
      code: "custom",
      message: "A schedule cycle must contain at least one working day.",
      path: ["weeks"],
    });
  }
}

/**
 * Business input for creating or replacing a v2 schedule. Persistence metadata is
 * deliberately absent so callers do not depend on a storage representation.
 */
export const scheduleV2InputSchema = z
  .object({
    ...scheduleV2CommonFields,
    version: z.literal(2).default(2),
  })
  .superRefine(validateScheduleV2);

export type ScheduleV2Input = z.input<typeof scheduleV2InputSchema>;
export type NormalizedScheduleV2Input = z.output<typeof scheduleV2InputSchema>;

/** Repository command for persisting a new effective v2 schedule. */
export const scheduleWriteInputSchema = z
  .object({
    ...scheduleV2CommonFields,
    createdByPlatformUserId: z.string().trim().min(1),
    employeeId: z.string().trim().min(1),
    version: z.literal(2).default(2),
  })
  .superRefine(validateScheduleV2);

export type ScheduleWriteInput = z.input<typeof scheduleWriteInputSchema>;
export type NormalizedScheduleWriteInput = z.output<typeof scheduleWriteInputSchema>;

/** A serializable v2 record returned by a scheduling repository. */
export const scheduleV2RecordSchema = z
  .object({
    ...scheduleV2CommonFields,
    employeeId: z.string().trim().min(1),
    id: z.string().trim().min(1),
    version: z.literal(2),
  })
  .superRefine(validateScheduleV2);

export type ScheduleV2 = z.output<typeof scheduleV2RecordSchema>;

export const legacyWorkFractionSchema = z.union([
  z.literal(0),
  z.literal(0.5),
  z.literal(1),
]);
export const legacyHalfDayPeriodSchema = z.enum(["morning", "afternoon"]);

export type LegacyWorkFraction = z.infer<typeof legacyWorkFractionSchema>;
export type LegacyHalfDayPeriod = z.infer<typeof legacyHalfDayPeriodSchema>;

export const legacyScheduleDaySchema = z
  .object({
    dayOfWeek: scheduleDayOfWeekSchema,
    halfDayPeriod: legacyHalfDayPeriodSchema.nullish().default(null),
    workFraction: legacyWorkFractionSchema,
  })
  .superRefine((day, context) => {
    if (day.workFraction === 0.5 && day.halfDayPeriod === null) {
      context.addIssue({
        code: "custom",
        message: "A legacy half day must identify its period.",
        path: ["halfDayPeriod"],
      });
    }

    if (day.workFraction !== 0.5 && day.halfDayPeriod !== null) {
      context.addIssue({
        code: "custom",
        message: "A legacy period is only valid for a half day.",
        path: ["halfDayPeriod"],
      });
    }
  });

export type LegacyScheduleDay = z.output<typeof legacyScheduleDaySchema>;

const legacyScheduleDaysSchema = z
  .array(legacyScheduleDaySchema)
  .length(7)
  .superRefine((days, context) => {
    const uniqueDays = new Set(days.map((day) => day.dayOfWeek));

    if (uniqueDays.size !== scheduleDayOfWeekOrder.length) {
      context.addIssue({
        code: "custom",
        message: "A legacy schedule must contain each weekday exactly once.",
      });
    }

    if (days.every((day) => day.workFraction === 0)) {
      context.addIssue({
        code: "custom",
        message: "A schedule must contain at least one working day.",
      });
    }
  })
  .transform((days) =>
    [...days].sort(
      (first, second) =>
        scheduleDayOfWeekOrder.indexOf(first.dayOfWeek) -
        scheduleDayOfWeekOrder.indexOf(second.dayOfWeek),
    ),
  );

const legacyScheduleV1CommonFields = {
  days: legacyScheduleDaysSchema,
  effectiveFrom: scheduleDateSchema,
  effectiveTo: scheduleDateSchema.nullish().default(null),
  employeeId: z.string().trim().min(1),
  id: z.string().trim().min(1),
  timezone: z.literal(COSTA_RICA_TIMEZONE).default(COSTA_RICA_TIMEZONE),
};

/**
 * Shape used only at the migration boundary for existing unversioned schedules.
 */
export const unversionedLegacyScheduleSchema = z
  .object(legacyScheduleV1CommonFields)
  .superRefine(validateEffectiveDateRange);

type ParsedUnversionedLegacySchedule = z.input<typeof unversionedLegacyScheduleSchema>;

export type UnversionedLegacySchedule = Omit<
  ParsedUnversionedLegacySchedule,
  "days"
> & {
  days: readonly z.input<typeof legacyScheduleDaySchema>[];
};

/** Explicit v1 representation kept separate from the canonical v2 model. */
export const legacyScheduleV1RecordSchema = z
  .object({
    ...legacyScheduleV1CommonFields,
    version: z.literal(1),
  })
  .superRefine(validateEffectiveDateRange);

export type LegacyScheduleV1 = z.output<typeof legacyScheduleV1RecordSchema>;

export function normalizeLegacyScheduleV1(
  schedule: UnversionedLegacySchedule,
): LegacyScheduleV1 {
  const legacy = unversionedLegacyScheduleSchema.parse({
    ...schedule,
    days: [...schedule.days],
  });
  return legacyScheduleV1RecordSchema.parse({ ...legacy, version: 1 });
}

export const scheduleRecordSchema = z.union([
  legacyScheduleV1RecordSchema,
  scheduleV2RecordSchema,
]);

export type ScheduleRecord = z.output<typeof scheduleRecordSchema>;
export const storedScheduleSchema = scheduleRecordSchema;
export type StoredSchedule = ScheduleRecord;

export type SchedulingDomainErrorCode =
  | "coverage_gap"
  | "employee_not_found"
  | "invalid_range"
  | "overlapping_schedule_coverage"
  | "schedule_overlap";

export type SchedulingDomainErrorDetails = Readonly<{
  date: string | null;
  endDate: string | null;
  sourceScheduleIds: readonly string[];
  startDate: string | null;
}>;

export class SchedulingDomainError extends Error {
  constructor(
    public readonly code: SchedulingDomainErrorCode,
    public readonly details: SchedulingDomainErrorDetails = {
      date: null,
      endDate: null,
      sourceScheduleIds: [],
      startDate: null,
    },
  ) {
    super(code);
    this.name = "SchedulingDomainError";
  }
}

function invalidRangeError(startDate: string, endDate: string) {
  return new SchedulingDomainError("invalid_range", {
    date: null,
    endDate,
    sourceScheduleIds: [],
    startDate,
  });
}

function assertValidCalculationRange(startDate: string, endDate: string) {
  if (
    !isValidScheduleDate(startDate) ||
    !isValidScheduleDate(endDate) ||
    endDate < startDate
  ) {
    throw invalidRangeError(startDate, endDate);
  }
}

function addCalendarDays(value: string, days: number) {
  const date = calendarDateToUtc(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function calendarDaysBetween(first: string, second: string) {
  return Math.round(
    (calendarDateToUtc(second).getTime() - calendarDateToUtc(first).getTime()) /
      MILLISECONDS_PER_DAY,
  );
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

export function isScheduleEffectiveOn(schedule: ScheduleRecord, date: string) {
  return (
    schedule.effectiveFrom <= date &&
    (schedule.effectiveTo === null || date <= schedule.effectiveTo)
  );
}

export function getScheduleCycleWeekIndex(schedule: ScheduleV2, date: string) {
  assertValidCalculationRange(date, date);
  const elapsedDays = calendarDaysBetween(schedule.anchorDate, date);
  const elapsedWeeks = Math.floor(elapsedDays / 7);
  return positiveModulo(elapsedWeeks, schedule.weeks.length);
}

export type ResolvedScheduleShift = Readonly<{
  clockTimeKnown: boolean;
  endTime: ScheduleClockTime | null;
  legacyHalfDayPeriod: LegacyHalfDayPeriod | null;
  scheduledMinutes: number;
  startTime: ScheduleClockTime | null;
}>;

function coverageGapError(date: string) {
  return new SchedulingDomainError("coverage_gap", {
    date,
    endDate: null,
    sourceScheduleIds: [],
    startDate: null,
  });
}

/** Resolves one already-selected effective record into its shift for a date. */
export function resolveScheduleShift(
  schedule: ScheduleRecord,
  date: string,
): ResolvedScheduleShift | null {
  assertValidCalculationRange(date, date);

  if (!isScheduleEffectiveOn(schedule, date)) {
    throw coverageGapError(date);
  }

  const dayOfWeek = dayOfWeekForDate(date);

  if (schedule.version === 1) {
    const day = schedule.days.find((candidate) => candidate.dayOfWeek === dayOfWeek)!;

    if (day.workFraction === 0) return null;

    return {
      clockTimeKnown: false,
      endTime: null,
      legacyHalfDayPeriod: day.halfDayPeriod,
      scheduledMinutes: day.workFraction === 1 ? 480 : 240,
      startTime: null,
    };
  }

  const weekIndex = getScheduleCycleWeekIndex(schedule, date);
  const shift = schedule.weeks[weekIndex]!.shifts.find(
    (candidate) => candidate.dayOfWeek === dayOfWeek,
  );

  if (!shift) return null;

  return {
    clockTimeKnown: true,
    endTime: shift.endTime,
    legacyHalfDayPeriod: null,
    scheduledMinutes: scheduledMinutesBetween(shift.startTime, shift.endTime),
    startTime: shift.startTime,
  };
}

export type ScheduleDateResolution = Readonly<{
  clockTimeKnown: boolean;
  cycleWeekIndex: number;
  date: string;
  dayOfWeek: ScheduleDayOfWeek;
  endTime: ScheduleClockTime | null;
  isWorkingDay: boolean;
  legacyHalfDayPeriod: LegacyHalfDayPeriod | null;
  scheduledMinutes: number;
  sourceScheduleId: string;
  sourceScheduleVersion: 1 | 2;
  startTime: ScheduleClockTime | null;
}>;

export function resolveScheduleDate(
  schedule: ScheduleRecord,
  date: string,
): ScheduleDateResolution {
  const shift = resolveScheduleShift(schedule, date);

  return {
    clockTimeKnown: shift?.clockTimeKnown ?? false,
    cycleWeekIndex:
      schedule.version === 2 ? getScheduleCycleWeekIndex(schedule, date) : 0,
    date,
    dayOfWeek: dayOfWeekForDate(date),
    endTime: shift?.endTime ?? null,
    isWorkingDay: shift !== null,
    legacyHalfDayPeriod: shift?.legacyHalfDayPeriod ?? null,
    scheduledMinutes: shift?.scheduledMinutes ?? 0,
    sourceScheduleId: schedule.id,
    sourceScheduleVersion: schedule.version,
    startTime: shift?.startTime ?? null,
  };
}

export type AverageWeeklySchedule = Readonly<{
  averageScheduledMinutes: number;
  averageWorkingDayCount: number;
  cycleWeekCount: 1 | 2;
}>;

/** Returns per-week averages across the complete repeating cycle. */
export function calculateAverageWeeklySchedule(
  schedule: ScheduleRecord,
): AverageWeeklySchedule {
  if (schedule.version === 1) {
    return {
      averageScheduledMinutes: schedule.days.reduce(
        (total, day) => total + day.workFraction * 480,
        0,
      ),
      averageWorkingDayCount: schedule.days.filter((day) => day.workFraction > 0)
        .length,
      cycleWeekCount: 1,
    };
  }

  const cycleScheduledMinutes = schedule.weeks.reduce(
    (total, week) =>
      total +
      week.shifts.reduce(
        (weekTotal, shift) =>
          weekTotal + scheduledMinutesBetween(shift.startTime, shift.endTime),
        0,
      ),
    0,
  );
  const cycleWorkingDayCount = schedule.weeks.reduce(
    (total, week) => total + week.shifts.length,
    0,
  );

  return {
    averageScheduledMinutes: cycleScheduledMinutes / schedule.weeks.length,
    averageWorkingDayCount: cycleWorkingDayCount / schedule.weeks.length,
    cycleWeekCount: schedule.weeks.length,
  };
}

export type ScheduleRangeCalculation = Readonly<{
  dateBreakdown: readonly ScheduleDateResolution[];
  endDate: string;
  sourceScheduleIds: readonly string[];
  startDate: string;
  totalScheduledMinutes: number;
  workingDates: readonly string[];
  workingDayCount: number;
}>;

function selectEffectiveSchedule(schedules: readonly ScheduleRecord[], date: string) {
  const matches = schedules.filter((schedule) => isScheduleEffectiveOn(schedule, date));

  if (matches.length === 0) throw coverageGapError(date);

  if (matches.length > 1) {
    throw new SchedulingDomainError("overlapping_schedule_coverage", {
      date,
      endDate: null,
      sourceScheduleIds: matches
        .map((schedule) => schedule.id)
        .sort((first, second) => first.localeCompare(second)),
      startDate: null,
    });
  }

  return matches[0]!;
}

/**
 * Calculates an inclusive calendar range. Every calendar date must be covered by
 * exactly one effective record; non-working dates still require schedule coverage.
 * Holidays are intentionally outside this domain calculation.
 */
export function calculateScheduleRange(
  schedules: readonly ScheduleRecord[],
  startDate: string,
  endDate: string,
): ScheduleRangeCalculation {
  assertValidCalculationRange(startDate, endDate);

  const dateBreakdown: ScheduleDateResolution[] = [];
  const sourceScheduleIds: string[] = [];
  const seenScheduleIds = new Set<string>();
  const inclusiveDayCount = calendarDaysBetween(startDate, endDate) + 1;

  if (inclusiveDayCount > MAX_SCHEDULE_CALCULATION_DAYS) {
    throw invalidRangeError(startDate, endDate);
  }

  for (let offset = 0; offset < inclusiveDayCount; offset += 1) {
    const date = addCalendarDays(startDate, offset);
    const schedule = selectEffectiveSchedule(schedules, date);
    const resolution = resolveScheduleDate(schedule, date);

    dateBreakdown.push(resolution);

    if (!seenScheduleIds.has(schedule.id)) {
      seenScheduleIds.add(schedule.id);
      sourceScheduleIds.push(schedule.id);
    }
  }

  const workingDates = dateBreakdown
    .filter((date) => date.isWorkingDay)
    .map((date) => date.date);

  return {
    dateBreakdown,
    endDate,
    sourceScheduleIds,
    startDate,
    totalScheduledMinutes: dateBreakdown.reduce(
      (total, date) => total + date.scheduledMinutes,
      0,
    ),
    workingDates,
    workingDayCount: workingDates.length,
  };
}
