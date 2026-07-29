import type { ObjectId } from "mongodb";
import { z } from "zod";

import {
  isoCalendarDateSchema,
  objectIdStringSchema,
} from "@/features/employees/domain/shared";

export const dayOfWeekSchema = z.enum([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);
export const workFractionSchema = z.union([z.literal(0), z.literal(0.5), z.literal(1)]);
export const halfDayPeriodSchema = z.enum(["morning", "afternoon"]);

export type DayOfWeek = z.infer<typeof dayOfWeekSchema>;
export type WorkFraction = z.infer<typeof workFractionSchema>;
export type HalfDayPeriod = z.infer<typeof halfDayPeriodSchema>;

export type ScheduledDay = {
  dayOfWeek: DayOfWeek;
  halfDayPeriod: HalfDayPeriod | null;
  workFraction: WorkFraction;
};

export type EmployeeScheduleDocument = {
  _id: ObjectId;
  createdAt: Date;
  createdByPlatformUserId: ObjectId;
  days: ScheduledDay[];
  effectiveFrom: string;
  effectiveTo: string | null;
  employeeId: ObjectId;
  timezone: "America/Costa_Rica";
};

export type EmployeeSchedule = Omit<
  EmployeeScheduleDocument,
  "_id" | "createdByPlatformUserId" | "employeeId"
> & {
  createdByPlatformUserId: string;
  employeeId: string;
  id: string;
};

export const dayOfWeekOrder: readonly DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const scheduledDaySchema = z
  .object({
    dayOfWeek: dayOfWeekSchema,
    halfDayPeriod: halfDayPeriodSchema.nullish().default(null),
    workFraction: workFractionSchema,
  })
  .superRefine((day, context) => {
    if (day.workFraction === 0.5 && day.halfDayPeriod === null) {
      context.addIssue({
        code: "custom",
        message: "Seleccioná mañana o tarde para el medio día.",
        path: ["halfDayPeriod"],
      });
    }

    if (day.workFraction !== 0.5 && day.halfDayPeriod !== null) {
      context.addIssue({
        code: "custom",
        message: "El período solo se usa para medios días.",
        path: ["halfDayPeriod"],
      });
    }
  });

export const employeeScheduleInputSchema = z
  .object({
    createdByPlatformUserId: objectIdStringSchema,
    days: z.array(scheduledDaySchema).length(7),
    effectiveFrom: isoCalendarDateSchema,
    effectiveTo: isoCalendarDateSchema.nullish().default(null),
    employeeId: objectIdStringSchema,
    timezone: z.literal("America/Costa_Rica").default("America/Costa_Rica"),
  })
  .superRefine((schedule, context) => {
    const uniqueDays = new Set(schedule.days.map((day) => day.dayOfWeek));

    if (uniqueDays.size !== dayOfWeekOrder.length) {
      context.addIssue({
        code: "custom",
        message: "El horario debe incluir cada día de la semana una sola vez.",
        path: ["days"],
      });
    }

    if (schedule.days.every((day) => day.workFraction === 0)) {
      context.addIssue({
        code: "custom",
        message: "El horario debe incluir al menos un período de trabajo.",
        path: ["days"],
      });
    }

    if (schedule.effectiveTo && schedule.effectiveTo < schedule.effectiveFrom) {
      context.addIssue({
        code: "custom",
        message: "La fecha final no puede ser anterior a la fecha inicial.",
        path: ["effectiveTo"],
      });
    }
  })
  .transform((schedule) => ({
    ...schedule,
    days: [...schedule.days].sort(
      (first, second) =>
        dayOfWeekOrder.indexOf(first.dayOfWeek) -
        dayOfWeekOrder.indexOf(second.dayOfWeek),
    ),
  }));

export type EmployeeScheduleInput = z.input<typeof employeeScheduleInputSchema>;
export type NormalizedEmployeeScheduleInput = z.output<
  typeof employeeScheduleInputSchema
>;

export function calculateWeeklySchedule(days: readonly ScheduledDay[]) {
  const weeklyScheduledDays = days.reduce((total, day) => total + day.workFraction, 0);

  return {
    weeklyScheduledDays,
    weeklyScheduledHours: weeklyScheduledDays * 8,
  };
}

export function toEmployeeSchedule(
  document: EmployeeScheduleDocument,
): EmployeeSchedule {
  const { _id, createdByPlatformUserId, employeeId, ...schedule } = document;

  return {
    ...schedule,
    createdByPlatformUserId: createdByPlatformUserId.toHexString(),
    employeeId: employeeId.toHexString(),
    id: _id.toHexString(),
  };
}
