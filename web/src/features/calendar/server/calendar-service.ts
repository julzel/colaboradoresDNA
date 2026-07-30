import "server-only";

import { createHash } from "node:crypto";

import type { PlatformUser } from "@/features/auth/domain/platform-user";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";
import type { CalendarEntry } from "@/features/calendar/domain/calendar-entry";
import type {
  CalendarEvent,
  NormalizedCalendarEventInput,
} from "@/features/calendar/domain/calendar-event";
import {
  addCalendarDays,
  calendarDateToUtc,
  getCalendarMonthRange,
  getTodayInCostaRica,
  isLeapYear,
} from "@/features/calendar/domain/calendar-utils";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEventDetail,
  listCalendarEventTargetOptions,
  listVisibleCalendarEvents,
  updateCalendarEvent,
  type CalendarActor,
} from "@/features/calendar/server/calendar-event-repository";
import { findEffectiveEmployeeAssignment } from "@/features/employees/server/assignment-repository";
import {
  findEmployeeByPlatformUserId,
  listBirthdayCalendarEntries,
} from "@/features/employees/server/employee-repository";

async function resolveCalendarActor(
  platformUser: PlatformUser,
): Promise<CalendarActor> {
  const employee = await findEmployeeByPlatformUserId(platformUser.id);
  const assignment = employee
    ? await findEffectiveEmployeeAssignment({
        employeeId: employee.id,
        onDate: getTodayInCostaRica(),
      })
    : null;

  return {
    departmentId: assignment?.departmentId ?? null,
    platformUserId: platformUser.id,
    role: platformUser.role,
  };
}

async function requireCalendarActor({
  canManage = false,
}: {
  canManage?: boolean;
} = {}) {
  const { platformUser } = await requirePlatformUser(
    canManage ? { roles: ["administrator", "supervisor"] } : {},
  );
  return resolveCalendarActor(platformUser);
}

function eventToEntry(actor: CalendarActor, event: CalendarEvent): CalendarEntry {
  const canManage =
    actor.role === "administrator" ||
    (actor.role === "supervisor" &&
      (event.organizerPlatformUserId === actor.platformUserId ||
        (event.visibility === "department" &&
          event.departmentId === actor.departmentId)));

  return {
    allDay: event.allDay,
    canManage,
    description: event.description,
    detailHref: `/calendario/eventos/${event.id}`,
    endAt: event.endsAt,
    endDate: event.endDate,
    id: `event:${event.id}`,
    kind: "event",
    label: "Evento",
    location: event.location,
    meetingUrl: event.meetingUrl,
    note: null,
    startAt: event.startsAt,
    startDate: event.startDate,
    title: event.title,
  };
}

function birthdayToEntry({
  birthday,
  displayName,
  employeeId,
  year,
}: {
  birthday: string;
  displayName: string;
  employeeId: string;
  year: number;
}): CalendarEntry {
  const [day = 1, month = 1] = birthday.split("/").map(Number);
  const shifted = month === 2 && day === 29 && !isLeapYear(year);
  const calendarDay = shifted ? 28 : day;
  const date = `${year}-${String(month).padStart(2, "0")}-${String(
    calendarDay,
  ).padStart(2, "0")}`;
  const startsAt = calendarDateToUtc(date);
  const endsAt = calendarDateToUtc(addCalendarDays(date, 1));
  const opaqueId = createHash("sha256").update(employeeId).digest("hex").slice(0, 16);

  return {
    allDay: true,
    canManage: false,
    description: null,
    detailHref: null,
    endAt: endsAt.toISOString(),
    endDate: date,
    id: `birthday:${opaqueId}:${year}`,
    kind: "birthday",
    label: "Cumpleaños",
    location: null,
    meetingUrl: null,
    note: shifted ? "Fecha registrada: 29 de febrero." : null,
    startAt: startsAt.toISOString(),
    startDate: date,
    title: displayName,
  };
}

export async function getCalendarEntries(month: string) {
  const actor = await requireCalendarActor();
  const range = getCalendarMonthRange(month);
  const [events, birthdays] = await Promise.all([
    listVisibleCalendarEvents({
      actor,
      endsAt: range.endAt,
      startsAt: range.startAt,
    }),
    listBirthdayCalendarEntries({ viewerRole: actor.role }),
  ]);
  const [year = 0, monthNumber = 0] = month.split("-").map(Number);
  const birthdayEntries = birthdays
    .filter((entry) => Number(entry.birthday.slice(3, 5)) === monthNumber)
    .map((entry) => birthdayToEntry({ ...entry, year }));

  return {
    canCreateEvents: actor.role === "administrator" || actor.role === "supervisor",
    entries: [...events.map((event) => eventToEntry(actor, event)), ...birthdayEntries],
  };
}

export async function getVisibleCalendarEventDetail(eventId: string) {
  const actor = await requireCalendarActor();
  return getCalendarEventDetail({ actor, eventId });
}

export async function getCalendarEventFormOptions() {
  const actor = await requireCalendarActor({ canManage: true });
  return listCalendarEventTargetOptions(actor);
}

export async function createCalendarEventForActor(input: NormalizedCalendarEventInput) {
  const actor = await requireCalendarActor({ canManage: true });
  return createCalendarEvent({ actor, input });
}

export async function updateCalendarEventForActor({
  eventId,
  input,
}: {
  eventId: string;
  input: NormalizedCalendarEventInput;
}) {
  const actor = await requireCalendarActor({ canManage: true });
  return updateCalendarEvent({ actor, eventId, input });
}

export async function deleteCalendarEventForActor(eventId: string) {
  const actor = await requireCalendarActor({ canManage: true });
  return deleteCalendarEvent({ actor, eventId });
}
