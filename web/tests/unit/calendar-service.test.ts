import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createCalendarEventForActor,
  getCalendarEntries,
} from "@/features/calendar/server/calendar-service";

const mocks = vi.hoisted(() => ({
  createCalendarEvent: vi.fn(),
  findEffectiveEmployeeAssignment: vi.fn(),
  findEmployeeByPlatformUserId: vi.fn(),
  listBirthdayCalendarEntries: vi.fn(),
  listCalendarEventTargetOptions: vi.fn(),
  listVisibleCalendarEvents: vi.fn(),
  requirePlatformUser: vi.fn(),
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
  getCalendarEventDetail: vi.fn(),
  listCalendarEventTargetOptions: mocks.listCalendarEventTargetOptions,
  listVisibleCalendarEvents: mocks.listVisibleCalendarEvents,
  updateCalendarEvent: vi.fn(),
}));

describe("calendar service authorization and aggregation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: {
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
    mocks.listCalendarEventTargetOptions.mockResolvedValue({
      departments: [],
      people: [],
    });
    mocks.listBirthdayCalendarEntries.mockResolvedValue([
      {
        birthday: "06/07",
        displayName: "Ana Mora",
        employeeId: "507f1f77bcf86cd799439014",
      },
    ]);
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
    expect(result.canCreateEvents).toBe(true);
    expect(result.eventFormOptions).toEqual({ departments: [], people: [] });
    expect(mocks.listCalendarEventTargetOptions).toHaveBeenCalledWith({
      departmentId: "507f1f77bcf86cd799439013",
      platformUserId: "507f1f77bcf86cd799439011",
      role: "supervisor",
    });
    expect(result.entries[0]).toMatchObject({
      kind: "birthday",
      startDate: "2026-07-06",
      title: "Ana Mora",
    });
  });

  it("requires a management role before creating an event", async () => {
    const input = {
      allDay: true,
      departmentId: null,
      description: null,
      endsAt: new Date("2026-07-15T06:00:00.000Z"),
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
});
