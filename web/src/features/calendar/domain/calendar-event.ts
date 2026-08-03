import type { ObjectId } from "mongodb";
import { z } from "zod";

import {
  addCalendarDays,
  calendarDateToUtc,
  isValidIsoDate,
  isValidLocalDateTime,
  localDateTimeToUtc,
  utcToCostaRicaDate,
  utcToCostaRicaDateTime,
} from "@/features/calendar/domain/calendar-utils";

export const calendarEventVisibilitySchema = z.enum([
  "company",
  "department",
  "invited",
]);

export const calendarEventTypeSchema = z.enum([
  "training",
  "one_on_one",
  "celebration",
  "custom",
]);

export const calendarEventTypeLabels = {
  celebration: "Celebración",
  custom: "Evento personalizado",
  one_on_one: "1:1",
  training: "Capacitación",
} as const satisfies Record<CalendarEventType, string>;

export const calendarEventTypeOptions: ReadonlyArray<{
  label: string;
  value: CalendarEventType;
}> = [
  { label: calendarEventTypeLabels.training, value: "training" },
  { label: calendarEventTypeLabels.one_on_one, value: "one_on_one" },
  { label: calendarEventTypeLabels.celebration, value: "celebration" },
  { label: calendarEventTypeLabels.custom, value: "custom" },
];

export type CalendarEventVisibility = z.infer<typeof calendarEventVisibilitySchema>;
export type CalendarEventType = z.infer<typeof calendarEventTypeSchema>;

export type CalendarEventDocument = {
  _id: ObjectId;
  allDay: boolean;
  createdAt: Date;
  deletedAt: Date | null;
  deletedByPlatformUserId: ObjectId | null;
  departmentId: ObjectId | null;
  description: string | null;
  endsAt: Date;
  eventType?: CalendarEventType;
  inviteePlatformUserIds: ObjectId[];
  location: string | null;
  meetingUrl: string | null;
  organizerPlatformUserId: ObjectId;
  startsAt: Date;
  status: "active" | "deleted";
  timezone: "America/Costa_Rica";
  title: string;
  updatedAt: Date;
  visibility: CalendarEventVisibility;
};

export type CalendarEvent = {
  allDay: boolean;
  createdAt: string;
  departmentId: string | null;
  description: string | null;
  endDate: string;
  endLocal: string;
  endsAt: string;
  eventType: CalendarEventType;
  id: string;
  inviteePlatformUserIds: string[];
  location: string | null;
  meetingUrl: string | null;
  organizerPlatformUserId: string;
  startDate: string;
  startLocal: string;
  startsAt: string;
  title: string;
  updatedAt: string;
  visibility: CalendarEventVisibility;
};

function optionalText(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .transform((value) => (value ? value.replace(/\s+/g, " ") : null));
}

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "La persona seleccionada no es válida.");

export const calendarEventInputSchema = z
  .object({
    allDay: z.boolean(),
    departmentId: z.string().trim().nullable().default(null),
    description: optionalText(2000),
    endDate: z.string().trim().default(""),
    endDateTime: z.string().trim().default(""),
    eventType: calendarEventTypeSchema,
    inviteePlatformUserIds: z.array(objectIdSchema).default([]),
    location: optionalText(200),
    meetingUrl: z
      .string()
      .trim()
      .max(500)
      .refine(
        (value) => value === "" || z.url().safeParse(value).success,
        "Ingresá un enlace válido.",
      )
      .transform((value) => value || null),
    startDate: z.string().trim().default(""),
    startDateTime: z.string().trim().default(""),
    title: z
      .string()
      .trim()
      .transform((value) => value.replace(/\s+/g, " "))
      .pipe(
        z
          .string()
          .min(2, "Ingresá un título.")
          .max(120, "El título no puede superar 120 caracteres."),
      ),
    visibility: calendarEventVisibilitySchema,
  })
  .superRefine((event, context) => {
    if (event.allDay) {
      if (!isValidIsoDate(event.startDate)) {
        context.addIssue({
          code: "custom",
          message: "Ingresá una fecha inicial válida.",
          path: ["startDate"],
        });
      }
      if (!isValidIsoDate(event.endDate)) {
        context.addIssue({
          code: "custom",
          message: "Ingresá una fecha final válida.",
          path: ["endDate"],
        });
      }
      if (
        isValidIsoDate(event.startDate) &&
        isValidIsoDate(event.endDate) &&
        event.endDate < event.startDate
      ) {
        context.addIssue({
          code: "custom",
          message: "La fecha final no puede ser anterior a la inicial.",
          path: ["endDate"],
        });
      }
    } else {
      if (!isValidLocalDateTime(event.startDateTime)) {
        context.addIssue({
          code: "custom",
          message: "Ingresá una fecha y hora inicial válidas.",
          path: ["startDateTime"],
        });
      }
      if (!isValidLocalDateTime(event.endDateTime)) {
        context.addIssue({
          code: "custom",
          message: "Ingresá una fecha y hora final válidas.",
          path: ["endDateTime"],
        });
      }
      if (
        isValidLocalDateTime(event.startDateTime) &&
        isValidLocalDateTime(event.endDateTime) &&
        localDateTimeToUtc(event.endDateTime) <= localDateTimeToUtc(event.startDateTime)
      ) {
        context.addIssue({
          code: "custom",
          message: "La hora final debe ser posterior a la inicial.",
          path: ["endDateTime"],
        });
      }
    }

    if (
      event.visibility === "department" &&
      !objectIdSchema.safeParse(event.departmentId).success
    ) {
      context.addIssue({
        code: "custom",
        message: "Seleccioná un departamento.",
        path: ["departmentId"],
      });
    }

    if (event.visibility === "invited" && event.inviteePlatformUserIds.length === 0) {
      context.addIssue({
        code: "custom",
        message: "Seleccioná al menos una persona.",
        path: ["inviteePlatformUserIds"],
      });
    }
  })
  .transform((event) => {
    const startsAt = event.allDay
      ? calendarDateToUtc(event.startDate)
      : localDateTimeToUtc(event.startDateTime);
    const endsAt = event.allDay
      ? calendarDateToUtc(addCalendarDays(event.endDate, 1))
      : localDateTimeToUtc(event.endDateTime);

    return {
      allDay: event.allDay,
      departmentId: event.visibility === "department" ? event.departmentId : null,
      description: event.description,
      endsAt,
      inviteePlatformUserIds: [...new Set(event.inviteePlatformUserIds)],
      location: event.location,
      meetingUrl: event.meetingUrl,
      startsAt,
      eventType: event.eventType,
      title: event.title,
      visibility: event.visibility,
    };
  });

export type CalendarEventInput = z.input<typeof calendarEventInputSchema>;
export type NormalizedCalendarEventInput = z.output<typeof calendarEventInputSchema>;

export class CalendarDomainError extends Error {
  constructor(
    public readonly code:
      | "department_forbidden"
      | "department_not_found"
      | "event_forbidden"
      | "event_not_found"
      | "invitee_not_found",
  ) {
    super(code);
    this.name = "CalendarDomainError";
  }
}

export function toCalendarEvent(document: CalendarEventDocument): CalendarEvent {
  const inclusiveEnd = new Date(document.endsAt.getTime() - 1);

  return {
    allDay: document.allDay,
    createdAt: document.createdAt.toISOString(),
    departmentId: document.departmentId?.toHexString() ?? null,
    description: document.description,
    endDate: utcToCostaRicaDate(inclusiveEnd),
    endLocal: document.allDay
      ? utcToCostaRicaDate(inclusiveEnd)
      : utcToCostaRicaDateTime(document.endsAt),
    endsAt: document.endsAt.toISOString(),
    eventType: document.eventType ?? "custom",
    id: document._id.toHexString(),
    inviteePlatformUserIds: document.inviteePlatformUserIds.map((id) =>
      id.toHexString(),
    ),
    location: document.location,
    meetingUrl: document.meetingUrl,
    organizerPlatformUserId: document.organizerPlatformUserId.toHexString(),
    startDate: utcToCostaRicaDate(document.startsAt),
    startLocal: document.allDay
      ? utcToCostaRicaDate(document.startsAt)
      : utcToCostaRicaDateTime(document.startsAt),
    startsAt: document.startsAt.toISOString(),
    title: document.title,
    updatedAt: document.updatedAt.toISOString(),
    visibility: document.visibility,
  };
}
