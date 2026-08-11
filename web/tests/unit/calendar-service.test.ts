import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createCalendarEventForActor,
  getCalendarDashboardNotifications,
  getCalendarEntries,
  getVisibleCalendarBirthdayDetail,
  getVisibleCalendarPtoDetail,
  getVisibleCalendarEventDetail,
  readDashboardNotification,
  updateCalendarEventForActor,
} from "@/features/calendar/server/calendar-service";

const mocks = vi.hoisted(() => ({
  createCalendarEvent: vi.fn(),
  findDevelopmentLinkForCalendarIntegration: vi.fn(),
  findEffectiveEmployeeAssignment: vi.fn(),
  findEmployeeByPlatformUserId: vi.fn(),
  getPtoRequestDetail: vi.fn(),
  getCalendarEventDetail: vi.fn(),
  listBirthdayCalendarEntries: vi.fn(),
  listCalendarEventTargetOptions: vi.fn(),
  listReadNotificationKeys: vi.fn(),
  listUpcomingCalendarEventNotifications: vi.fn(),
  listUpcomingProxyPtoNotifications: vi.fn(),
  listVisibleCalendarEvents: vi.fn(),
  listVisibleApprovedPtoForCalendar: vi.fn(),
  markNotificationKeysRead: vi.fn(),
  requirePlatformUser: vi.fn(),
  updateCalendarEvent: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/features/auth/server/require-platform-user", () => ({
  requirePlatformUser: mocks.requirePlatformUser,
}));

vi.mock("@/features/employees/server/employee-repository", () => ({
  findEmployeeByPlatformUserId: mocks.findEmployeeByPlatformUserId,
  listBirthdayCalendarEntries: mocks.listBirthdayCalendarEntries,
}));

vi.mock("@/features/employees/server/assignment-repository", () => ({
  findEffectiveEmployeeAssignment: mocks.findEffectiveEmployeeAssignment,
}));

vi.mock("@/features/calendar/server/calendar-event-repository", () => ({
  createCalendarEvent: mocks.createCalendarEvent,
  deleteCalendarEvent: vi.fn(),
  getCalendarEventDetail: mocks.getCalendarEventDetail,
  listCalendarEventTargetOptions: mocks.listCalendarEventTargetOptions,
  listUpcomingCalendarEventNotifications: mocks.listUpcomingCalendarEventNotifications,
  listVisibleCalendarEvents: mocks.listVisibleCalendarEvents,
  updateCalendarEvent: mocks.updateCalendarEvent,
}));

vi.mock("@/features/development/server/development-service", () => ({
  findDevelopmentLinkForCalendarIntegration:
    mocks.findDevelopmentLinkForCalendarIntegration,
}));

vi.mock("@/features/dashboard/server/notification-read-repository", () => ({
  listReadNotificationKeys: mocks.listReadNotificationKeys,
  markNotificationKeysRead: mocks.markNotificationKeysRead,
}));

vi.mock("@/features/pto/server/pto-service", () => ({
  getPtoRequestDetail: mocks.getPtoRequestDetail,
  listUpcomingProxyPtoNotifications: mocks.listUpcomingProxyPtoNotifications,
  listVisibleApprovedPtoForCalendar: mocks.listVisibleApprovedPtoForCalendar,
}));

describe("calendar service authorization and aggregation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: {
        displayName: "Ana Mora",
        id: "507f1f77bcf86cd799439011",
        role: "supervisor",
      },
    });
    mocks.findEmployeeByPlatformUserId.mockResolvedValue({
      id: "507f1f77bcf86cd799439012",
    });
    mocks.findEffectiveEmployeeAssignment.mockResolvedValue({
      departmentId: "507f1f77bcf86cd799439013",
    });
    mocks.listVisibleCalendarEvents.mockResolvedValue([]);
    mocks.listVisibleApprovedPtoForCalendar.mockResolvedValue([]);
    mocks.listCalendarEventTargetOptions.mockResolvedValue({
      departments: [],
      people: [],
    });
    mocks.listUpcomingCalendarEventNotifications.mockResolvedValue([]);
    mocks.listUpcomingProxyPtoNotifications.mockResolvedValue([]);
    mocks.listReadNotificationKeys.mockResolvedValue(new Set());
    mocks.listBirthdayCalendarEntries.mockResolvedValue([
      {
        birthday: "06/07",
        displayName: "Ana Mora",
        employeeId: "507f1f77bcf86cd799439014",
      },
    ]);
    mocks.findDevelopmentLinkForCalendarIntegration.mockResolvedValue(null);
  });

  it("passes the authenticated role and department to calendar sources", async () => {
    const result = await getCalendarEntries("2026-07");

    expect(mocks.listVisibleCalendarEvents).toHaveBeenCalledWith({
      actor: {
        departmentId: "507f1f77bcf86cd799439013",
        platformUserId: "507f1f77bcf86cd799439011",
        role: "supervisor",
      },
      endsAt: new Date("2026-08-01T06:00:00.000Z"),
      startsAt: new Date("2026-07-01T06:00:00.000Z"),
    });
    expect(mocks.listBirthdayCalendarEntries).toHaveBeenCalledWith({
      viewerRole: "supervisor",
    });
    expect(mocks.listVisibleApprovedPtoForCalendar).toHaveBeenCalledWith({
      endDate: "2026-07-31",
      platformUserId: "507f1f77bcf86cd799439011",
      role: "supervisor",
      startDate: "2026-07-01",
    });
    expect(result.canCreateEvents).toBe(true);
    expect(result.eventFormOptions).toEqual({ departments: [], people: [] });
    expect(mocks.listCalendarEventTargetOptions).toHaveBeenCalledWith({
      departmentId: "507f1f77bcf86cd799439013",
      platformUserId: "507f1f77bcf86cd799439011",
      role: "supervisor",
    });
    expect(result.entries[0]).toMatchObject({
      detailHref: expect.stringMatching(
        /^\/calendario\/cumpleanos\/[a-f0-9]{16}\/2026$/,
      ),
      kind: "birthday",
      startDate: "2026-07-06",
      title: "Ana Mora",
    });
  });

  it("routes approved leave through a calendar summary", async () => {
    mocks.listVisibleApprovedPtoForCalendar.mockResolvedValue([
      {
        durationUnits: 3,
        endDate: "2026-07-12",
        id: "507f1f77bcf86cd799439099",
        requesterName: "Ana Mora",
        startDate: "2026-07-11",
      },
    ]);

    const result = await getCalendarEntries("2026-07");

    expect(result.entries.find((entry) => entry.kind === "pto")).toMatchObject({
      detailHref: "/calendario/ausencias/507f1f77bcf86cd799439099",
      title: "Ana Mora",
    });
  });

  it("returns a calendar-safe birthday summary from its opaque id", async () => {
    const calendar = await getCalendarEntries("2026-07");
    const href = calendar.entries.find(
      (entry) => entry.kind === "birthday",
    )?.detailHref;
    const birthdayId = href?.split("/").at(-2);

    const detail = await getVisibleCalendarBirthdayDetail({
      birthdayId: birthdayId ?? "",
      year: 2026,
    });

    expect(detail).toEqual({
      date: "2026-07-06",
      displayName: "Ana Mora",
      note: null,
    });
  });

  it("returns only approved leave fields needed by the calendar summary", async () => {
    mocks.getPtoRequestDetail.mockResolvedValue({
      request: {
        category: "vacation",
        durationUnits: 2,
        endDate: "2026-07-12",
        id: "507f1f77bcf86cd799439099",
        requesterName: "Ana Mora",
        startDate: "2026-07-11",
        status: "approved",
      },
    });

    await expect(
      getVisibleCalendarPtoDetail("507f1f77bcf86cd799439099"),
    ).resolves.toEqual({
      category: "vacation",
      durationUnits: 2,
      endDate: "2026-07-12",
      id: "507f1f77bcf86cd799439099",
      requesterName: "Ana Mora",
      startDate: "2026-07-11",
      status: "approved",
    });
  });

  it("requires a management role before creating an event", async () => {
    const input = {
      allDay: true,
      departmentId: null,
      description: null,
      endsAt: new Date("2026-07-15T06:00:00.000Z"),
      eventType: "custom" as const,
      inviteePlatformUserIds: [],
      location: null,
      meetingUrl: null,
      startsAt: new Date("2026-07-14T06:00:00.000Z"),
      title: "Asamblea",
      visibility: "company" as const,
    };
    mocks.createCalendarEvent.mockResolvedValue({ id: "event" });

    await createCalendarEventForActor(input);

    expect(mocks.requirePlatformUser).toHaveBeenCalledWith({
      roles: ["administrator", "supervisor"],
    });
    expect(mocks.createCalendarEvent).toHaveBeenCalledWith({
      actor: {
        departmentId: "507f1f77bcf86cd799439013",
        platformUserId: "507f1f77bcf86cd799439011",
        role: "supervisor",
      },
      input,
    });
  });

  it("links an administrator's 1:1 calendar detail back to Development", async () => {
    const eventId = "507f1f77bcf86cd799439099";
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: {
        displayName: "Ana Mora",
        id: "507f1f77bcf86cd799439011",
        role: "administrator",
      },
    });
    mocks.getCalendarEventDetail.mockResolvedValue({
      event: { eventType: "one_on_one", id: eventId },
    });
    mocks.findDevelopmentLinkForCalendarIntegration.mockResolvedValue({
      employeeId: "507f1f77bcf86cd799439012",
      meetingId: "507f1f77bcf86cd799439013",
      status: "draft",
    });

    await expect(getVisibleCalendarEventDetail(eventId)).resolves.toMatchObject({
      developmentLink: {
        employeeId: "507f1f77bcf86cd799439012",
        meetingId: "507f1f77bcf86cd799439013",
      },
      viewerRole: "administrator",
    });
    expect(mocks.findDevelopmentLinkForCalendarIntegration).toHaveBeenCalledWith({
      actorRole: "administrator",
      calendarEventId: eventId,
    });
  });

  it("allows only schedule changes for a calendar event linked to Development", async () => {
    const eventId = "507f1f77bcf86cd799439099";
    const inviteeId = "507f1f77bcf86cd799439012";
    const safeInput = {
      allDay: false,
      departmentId: null,
      description: null,
      endsAt: new Date("2026-08-10T15:30:00.000Z"),
      eventType: "one_on_one" as const,
      inviteePlatformUserIds: [inviteeId],
      location: null,
      meetingUrl: null,
      startsAt: new Date("2026-08-10T15:00:00.000Z"),
      title: "Reunión 1:1",
      visibility: "invited" as const,
    };
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: {
        displayName: "Ana Mora",
        id: "507f1f77bcf86cd799439011",
        role: "administrator",
      },
    });
    mocks.findDevelopmentLinkForCalendarIntegration.mockResolvedValue({
      employeeId: inviteeId,
      meetingId: "507f1f77bcf86cd799439013",
      status: "draft",
    });
    mocks.getCalendarEventDetail.mockResolvedValue({
      event: { inviteePlatformUserIds: [inviteeId] },
    });
    mocks.updateCalendarEvent.mockResolvedValue({ id: eventId });

    await updateCalendarEventForActor({ eventId, input: safeInput });
    expect(mocks.updateCalendarEvent).toHaveBeenCalledWith({
      actor: expect.objectContaining({ role: "administrator" }),
      eventId,
      input: safeInput,
    });

    await expect(
      updateCalendarEventForActor({
        eventId,
        input: { ...safeInput, description: "Notas que no deben exponerse." },
      }),
    ).rejects.toMatchObject({ code: "event_forbidden" });
    expect(mocks.updateCalendarEvent).toHaveBeenCalledTimes(1);
  });

  it("makes the non-leap-year handling of 29 February explicit", async () => {
    mocks.listBirthdayCalendarEntries.mockResolvedValue([
      {
        birthday: "29/02",
        displayName: "Ana Mora",
        employeeId: "507f1f77bcf86cd799439014",
      },
    ]);

    const result = await getCalendarEntries("2026-02");

    expect(result.entries[0]).toMatchObject({
      note: "Fecha registrada: 29 de febrero.",
      startDate: "2026-02-28",
    });
  });

  it("returns upcoming events that explicitly include the signed-in employee", async () => {
    mocks.listUpcomingCalendarEventNotifications.mockResolvedValue([
      {
        eventType: "training",
        id: "event",
        title: "Seguridad alimentaria",
      },
    ]);

    const dashboard = await getCalendarDashboardNotifications();

    expect(mocks.listUpcomingCalendarEventNotifications).toHaveBeenCalledWith({
      limit: 100,
      platformUserId: "507f1f77bcf86cd799439011",
    });
    expect(mocks.listUpcomingProxyPtoNotifications).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439011",
      100,
    );
    expect(dashboard).toMatchObject({
      displayName: "Ana Mora",
      notifications: [{ eventType: "training", id: "event" }],
      unreadCount: 1,
    });
  });

  it("notifies an employee about upcoming approved leave created by an administrator", async () => {
    mocks.listUpcomingProxyPtoNotifications.mockResolvedValue([
      {
        category: "vacation",
        endDate: "2026-08-12",
        id: "leave-request",
        startDate: "2026-08-11",
      },
    ]);

    const dashboard = await getCalendarDashboardNotifications();

    expect(dashboard.notifications).toEqual([
      expect.objectContaining({
        href: "/ausencias/leave-request",
        id: "leave-request",
        kind: "pto",
        label: "Ausencia aprobada",
        title: "Vacaciones",
      }),
    ]);
  });

  it("marks a current notification as read and returns its trusted destination", async () => {
    const eventId = "507f1f77bcf86cd799439099";
    mocks.listUpcomingCalendarEventNotifications.mockResolvedValue([
      {
        allDay: true,
        endDate: "2026-08-12",
        eventType: "training",
        id: eventId,
        startDate: "2026-08-11",
        startsAt: "2026-08-11T06:00:00.000Z",
        title: "Seguridad alimentaria",
      },
    ]);

    const href = await readDashboardNotification(`event:${eventId}`);

    expect(mocks.markNotificationKeysRead).toHaveBeenCalledWith({
      notificationKeys: [`event:${eventId}`],
      platformUserId: "507f1f77bcf86cd799439011",
    });
    expect(href).toBe(`/calendario/eventos/${eventId}`);
  });
});
