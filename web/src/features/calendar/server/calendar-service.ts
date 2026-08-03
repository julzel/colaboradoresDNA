import "server-only";

import { createHash } from "node:crypto";
import { cache } from "react";

import type { PlatformUser } from "@/features/auth/domain/platform-user";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";
import type { CalendarEntry } from "@/features/calendar/domain/calendar-entry";
import type {
  CalendarEvent,
  NormalizedCalendarEventInput,
} from "@/features/calendar/domain/calendar-event";
import { calendarEventTypeLabels } from "@/features/calendar/domain/calendar-event";
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
  listUpcomingCalendarEventNotifications,
  listVisibleCalendarEvents,
  updateCalendarEvent,
  type CalendarActor,
} from "@/features/calendar/server/calendar-event-repository";
import { findEffectiveEmployeeAssignment } from "@/features/employees/server/assignment-repository";
import {
  findEmployeeByPlatformUserId,
  listBirthdayCalendarEntries,
} from "@/features/employees/server/employee-repository";
import type { DashboardNotification } from "@/features/dashboard/domain/dashboard-notification";
import {
  listReadNotificationKeys,
  markNotificationKeysRead,
} from "@/features/dashboard/server/notification-read-repository";
import { formatPtoDays, ptoCategoryLabels } from "@/features/pto/domain/pto";
import {
  listUpcomingProxyPtoNotifications,
  listVisibleApprovedPtoForCalendar,
} from "@/features/pto/server/pto-service";

const dashboardNotificationLimit = 100;

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
    label: calendarEventTypeLabels[event.eventType],
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

function ptoToEntry(pto: {
  durationUnits: number;
  endDate: string;
  id: string;
  requesterName: string;
  startDate: string;
}): CalendarEntry {
  return {
    allDay: true,
    canManage: false,
    description: null,
    detailHref: `/ausencias/${pto.id}`,
    endAt: calendarDateToUtc(addCalendarDays(pto.endDate, 1)).toISOString(),
    endDate: pto.endDate,
    id: `pto:${pto.id}`,
    kind: "pto",
    label: `Ausencia · ${formatPtoDays(pto.durationUnits)} días`,
    location: null,
    meetingUrl: null,
    note: null,
    startAt: calendarDateToUtc(pto.startDate).toISOString(),
    startDate: pto.startDate,
    title: pto.requesterName,
  };
}

export async function getCalendarEntries(month: string) {
  const actor = await requireCalendarActor();
  const range = getCalendarMonthRange(month);
  const canCreateEvents = actor.role === "administrator" || actor.role === "supervisor";
  const [events, birthdays, ptoEntries, eventFormOptions] = await Promise.all([
    listVisibleCalendarEvents({
      actor,
      endsAt: range.endAt,
      startsAt: range.startAt,
    }),
    listBirthdayCalendarEntries({ viewerRole: actor.role }),
    listVisibleApprovedPtoForCalendar({
      endDate: addCalendarDays(range.endDate, -1),
      platformUserId: actor.platformUserId,
      role: actor.role,
      startDate: range.startDate,
    }),
    canCreateEvents ? listCalendarEventTargetOptions(actor) : Promise.resolve(null),
  ]);
  const [year = 0, monthNumber = 0] = month.split("-").map(Number);
  const birthdayEntries = birthdays
    .filter((entry) => Number(entry.birthday.slice(3, 5)) === monthNumber)
    .map((entry) => birthdayToEntry({ ...entry, year }));

  return {
    canCreateEvents,
    entries: [
      ...events.map((event) => eventToEntry(actor, event)),
      ...birthdayEntries,
      ...ptoEntries.map(ptoToEntry),
    ],
    eventFormOptions,
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

const getDashboardNotificationState = cache(async (platformUserId: string) => {
  const [events, ptoRequests] = await Promise.all([
    listUpcomingCalendarEventNotifications({
      limit: dashboardNotificationLimit,
      platformUserId,
    }),
    listUpcomingProxyPtoNotifications(platformUserId, dashboardNotificationLimit),
  ]);
  const notificationSources: Array<Omit<DashboardNotification, "isUnread">> = [
    ...events.map((event) => ({
      allDay: event.allDay,
      endDate: event.endDate,
      eventType: event.eventType,
      href: `/calendario/eventos/${event.id}`,
      id: event.id,
      key: `event:${event.id}`,
      kind: "event" as const,
      label: calendarEventTypeLabels[event.eventType],
      startDate: event.startDate,
      startsAt: event.startsAt,
      title: event.title,
    })),
    ...ptoRequests.map((request) => ({
      allDay: true,
      endDate: request.endDate,
      eventType: null,
      href: `/ausencias/${request.id}`,
      id: request.id,
      key: `pto:${request.id}`,
      kind: "pto" as const,
      label: "Ausencia aprobada",
      startDate: request.startDate,
      startsAt: calendarDateToUtc(request.startDate).toISOString(),
      title: ptoCategoryLabels[request.category],
    })),
  ].sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  const readKeys = await listReadNotificationKeys({
    notificationKeys: notificationSources.map((notification) => notification.key),
    platformUserId,
  });
  const notifications: DashboardNotification[] = notificationSources.map(
    (notification) => ({
      ...notification,
      isUnread: !readKeys.has(notification.key),
    }),
  );

  return {
    notifications,
    unreadCount: notifications.filter((notification) => notification.isUnread).length,
  };
});

export async function getCalendarDashboardNotifications() {
  const { platformUser } = await requirePlatformUser();
  const state = await getDashboardNotificationState(platformUser.id);

  return {
    displayName: platformUser.displayName,
    notifications: state.notifications.slice(0, 5),
    unreadCount: state.unreadCount,
  };
}

export async function getCalendarDashboardUnreadCount(platformUserId: string) {
  return (await getDashboardNotificationState(platformUserId)).unreadCount;
}

export async function readDashboardNotification(notificationKey: string) {
  const { platformUser } = await requirePlatformUser();
  const state = await getDashboardNotificationState(platformUser.id);
  const notification = state.notifications.find(
    (candidate) => candidate.key === notificationKey,
  );
  if (!notification) return null;
  await markNotificationKeysRead({
    notificationKeys: [notification.key],
    platformUserId: platformUser.id,
  });
  return notification.href;
}

export async function readAllDashboardNotifications() {
  const { platformUser } = await requirePlatformUser();
  const state = await getDashboardNotificationState(platformUser.id);
  await markNotificationKeysRead({
    notificationKeys: state.notifications
      .filter((notification) => notification.isUnread)
      .map((notification) => notification.key),
    platformUserId: platformUser.id,
  });
}
