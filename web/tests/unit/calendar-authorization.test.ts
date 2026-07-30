import { describe, expect, it, vi } from "vitest";

import type { CalendarEvent } from "@/features/calendar/domain/calendar-event";
import { canManageCalendarEvent } from "@/features/calendar/server/calendar-event-repository";

vi.mock("server-only", () => ({}));

const event: CalendarEvent = {
  allDay: true,
  createdAt: "2026-07-01T06:00:00.000Z",
  departmentId: "507f1f77bcf86cd799439013",
  description: null,
  endDate: "2026-07-14",
  endLocal: "2026-07-14",
  endsAt: "2026-07-15T06:00:00.000Z",
  id: "507f1f77bcf86cd799439010",
  inviteePlatformUserIds: [],
  location: null,
  meetingUrl: null,
  organizerPlatformUserId: "507f1f77bcf86cd799439011",
  startDate: "2026-07-14",
  startLocal: "2026-07-14",
  startsAt: "2026-07-14T06:00:00.000Z",
  title: "Asamblea",
  updatedAt: "2026-07-01T06:00:00.000Z",
  visibility: "department",
};

describe("calendar event management policy", () => {
  it("allows administrators to manage any event", () => {
    expect(
      canManageCalendarEvent(
        {
          departmentId: null,
          platformUserId: "507f1f77bcf86cd799439099",
          role: "administrator",
        },
        event,
      ),
    ).toBe(true);
  });

  it("allows a supervisor to manage an event they organized", () => {
    expect(
      canManageCalendarEvent(
        {
          departmentId: "507f1f77bcf86cd799439099",
          platformUserId: event.organizerPlatformUserId,
          role: "supervisor",
        },
        { ...event, departmentId: null, visibility: "company" },
      ),
    ).toBe(true);
  });

  it("allows a supervisor to manage their department event", () => {
    expect(
      canManageCalendarEvent(
        {
          departmentId: event.departmentId,
          platformUserId: "507f1f77bcf86cd799439099",
          role: "supervisor",
        },
        event,
      ),
    ).toBe(true);
  });

  it("denies collaborators and unrelated supervisors", () => {
    expect(
      canManageCalendarEvent(
        {
          departmentId: event.departmentId,
          platformUserId: "507f1f77bcf86cd799439099",
          role: "collaborator",
        },
        event,
      ),
    ).toBe(false);
    expect(
      canManageCalendarEvent(
        {
          departmentId: "507f1f77bcf86cd799439098",
          platformUserId: "507f1f77bcf86cd799439099",
          role: "supervisor",
        },
        event,
      ),
    ).toBe(false);
  });
});
