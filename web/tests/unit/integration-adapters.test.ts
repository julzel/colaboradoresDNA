import { beforeEach, describe, expect, it, vi } from "vitest";

import { developmentCalendarIntegration } from "@/features/calendar/integrations/development-calendar-adapter";
import { calendarDevelopmentIntegration } from "@/features/development/integrations/calendar-development-adapter";
import { calendarPtoIntegration } from "@/features/pto/integrations/calendar-pto-adapter";

const mocks = vi.hoisted(() => ({
  createInternalOneOnOneCalendarEvent: vi.fn(),
  findInternalOneOnOneCalendarEventSummaryForAdministrator: vi.fn(),
  findOneOnOneByCalendarEventId: vi.fn(),
  getPtoRequestDetail: vi.fn(),
  listUpcomingProxyPtoNotifications: vi.fn(),
  listVisibleApprovedPtoForCalendar: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/features/calendar/server/calendar-event-repository", () => ({
  createInternalOneOnOneCalendarEvent: mocks.createInternalOneOnOneCalendarEvent,
  findInternalOneOnOneCalendarEventSummaryForAdministrator:
    mocks.findInternalOneOnOneCalendarEventSummaryForAdministrator,
}));

vi.mock("@/features/development/server/development-read-repository", () => ({
  findOneOnOneByCalendarEventId: mocks.findOneOnOneByCalendarEventId,
}));

vi.mock("@/features/pto/server/pto-service", () => ({
  getPtoRequestDetail: mocks.getPtoRequestDetail,
  listUpcomingProxyPtoNotifications: mocks.listUpcomingProxyPtoNotifications,
  listVisibleApprovedPtoForCalendar: mocks.listVisibleApprovedPtoForCalendar,
}));

describe("cross-feature integration adapters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("translates Development scheduling into Calendar's internal contract", async () => {
    const session = {} as never;
    mocks.createInternalOneOnOneCalendarEvent.mockResolvedValue({ id: "event-id" });

    await expect(
      developmentCalendarIntegration.createOneOnOneEvent({
        actorPlatformUserId: "507f1f77bcf86cd799439011",
        endDateTime: "2026-08-26T10:30",
        session,
        startDateTime: "2026-08-26T10:00",
        targetEmployeeId: "507f1f77bcf86cd799439012",
      }),
    ).resolves.toBe("event-id");
    expect(mocks.createInternalOneOnOneCalendarEvent).toHaveBeenCalledWith({
      actor: {
        departmentId: null,
        platformUserId: "507f1f77bcf86cd799439011",
        role: "administrator",
      },
      endsAt: new Date("2026-08-26T16:30:00.000Z"),
      session,
      startsAt: new Date("2026-08-26T16:00:00.000Z"),
      targetEmployeeId: "507f1f77bcf86cd799439012",
    });
  });

  it("returns only Calendar's narrow Development link contract", async () => {
    mocks.findOneOnOneByCalendarEventId.mockResolvedValue({
      employeeId: "507f1f77bcf86cd799439012",
      meetingId: "507f1f77bcf86cd799439013",
      privateNarrative: "must not cross the boundary",
      status: "draft",
    });

    await expect(
      calendarDevelopmentIntegration.findLinkedOneOnOne({
        actorRole: "administrator",
        calendarEventId: "507f1f77bcf86cd799439099",
      }),
    ).resolves.toEqual({
      employeeId: "507f1f77bcf86cd799439012",
      meetingId: "507f1f77bcf86cd799439013",
    });
  });

  it("maps PTO domain values into Calendar-owned display DTOs", async () => {
    mocks.getPtoRequestDetail.mockResolvedValue({
      request: {
        category: "vacation",
        durationUnits: 3,
        endDate: "2026-08-27",
        id: "507f1f77bcf86cd799439099",
        requesterName: "Ana Mora",
        startDate: "2026-08-26",
        status: "approved",
      },
    });

    await expect(
      calendarPtoIntegration.getVisibleApprovedAbsenceDetail(
        "507f1f77bcf86cd799439099",
      ),
    ).resolves.toEqual({
      category: "vacation",
      categoryLabel: "Vacaciones",
      durationLabel: "1,5",
      endDate: "2026-08-27",
      id: "507f1f77bcf86cd799439099",
      requesterName: "Ana Mora",
      startDate: "2026-08-26",
      statusLabel: "Aprobada",
    });
  });
});
