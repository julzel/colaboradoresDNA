import { describe, expect, it } from "vitest";

import {
  calendarEntryOccursOn,
  groupCalendarAgendaEntries,
  type CalendarEntry,
} from "@/features/calendar/domain/calendar-entry";
import { calendarEventInputSchema } from "@/features/calendar/domain/calendar-event";
import {
  createCalendarUrl,
  getAdjacentCalendarMonth,
  parseCalendarQuery,
} from "@/features/calendar/domain/calendar-query";
import {
  getCalendarMonthDays,
  isLeapYear,
} from "@/features/calendar/domain/calendar-utils";

const baseEntry: CalendarEntry = {
  allDay: true,
  canManage: false,
  description: null,
  detailHref: null,
  endAt: "2026-07-14T06:00:00.000Z",
  endDate: "2026-07-13",
  id: "entry",
  kind: "birthday",
  label: "Cumpleaños",
  location: null,
  meetingUrl: null,
  note: null,
  startAt: "2026-07-13T06:00:00.000Z",
  startDate: "2026-07-13",
  title: "Ana Mora",
};

describe("calendar query", () => {
  it("defaults invalid values to the agenda and current month", () => {
    expect(
      parseCalendarQuery(
        { dia: "invalid", mes: "2026-99", vista: "semana" },
        "2026-07",
      ),
    ).toEqual({ day: null, month: "2026-07", view: "agenda" });
  });

  it("preserves a valid selected day in month view", () => {
    expect(
      parseCalendarQuery(
        { dia: "2026-07-13", mes: "2026-07", vista: "mes" },
        "2026-08",
      ),
    ).toEqual({ day: "2026-07-13", month: "2026-07", view: "month" });
  });

  it("builds stable Spanish URL parameters and adjacent months", () => {
    const query = { day: null, month: "2026-01", view: "agenda" } as const;
    expect(createCalendarUrl(query)).toBe("/calendario?mes=2026-01&vista=agenda");
    expect(getAdjacentCalendarMonth(query, -1)).toBe(
      "/calendario?mes=2025-12&vista=agenda",
    );
  });
});

describe("calendar dates and entries", () => {
  it("builds a Monday-first six-week month matrix", () => {
    const days = getCalendarMonthDays("2026-07");
    expect(days).toHaveLength(42);
    expect(days[0]?.value).toBe("2026-06-29");
    expect(days[41]?.value).toBe("2026-08-09");
  });

  it("detects leap years correctly", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2100)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
  });

  it("groups overlapping entries at the visible month boundary", () => {
    const spanningEntry = {
      ...baseEntry,
      endDate: "2026-07-03",
      id: "spanning",
      startAt: "2026-06-29T06:00:00.000Z",
      startDate: "2026-06-29",
    };
    const groups = groupCalendarAgendaEntries([baseEntry, spanningEntry], "2026-07-01");

    expect(groups.map((group) => group.date)).toEqual(["2026-07-01", "2026-07-13"]);
    expect(calendarEntryOccursOn(spanningEntry, "2026-07-02")).toBe(true);
    expect(calendarEntryOccursOn(spanningEntry, "2026-07-04")).toBe(false);
  });
});

describe("calendar event input", () => {
  it("normalizes an all-day inclusive date range to an exclusive UTC end", () => {
    const parsed = calendarEventInputSchema.parse({
      allDay: true,
      departmentId: null,
      description: "  Reunión   general ",
      endDate: "2026-07-15",
      endDateTime: "",
      eventType: "training",
      inviteePlatformUserIds: [],
      location: "",
      meetingUrl: "",
      startDate: "2026-07-14",
      startDateTime: "",
      title: "  Asamblea   general ",
      visibility: "company",
    });

    expect(parsed.title).toBe("Asamblea general");
    expect(parsed.description).toBe("Reunión general");
    expect(parsed.startsAt.toISOString()).toBe("2026-07-14T06:00:00.000Z");
    expect(parsed.endsAt.toISOString()).toBe("2026-07-16T06:00:00.000Z");
  });

  it("converts timed Costa Rica input to UTC", () => {
    const parsed = calendarEventInputSchema.parse({
      allDay: false,
      departmentId: null,
      description: "",
      endDate: "",
      endDateTime: "2026-07-14T10:30",
      eventType: "one_on_one",
      inviteePlatformUserIds: [],
      location: "",
      meetingUrl: "",
      startDate: "",
      startDateTime: "2026-07-14T09:00",
      title: "Seguimiento",
      visibility: "company",
    });

    expect(parsed.startsAt.toISOString()).toBe("2026-07-14T15:00:00.000Z");
    expect(parsed.endsAt.toISOString()).toBe("2026-07-14T16:30:00.000Z");
  });

  it("requires the target associated with scoped visibility", () => {
    const result = calendarEventInputSchema.safeParse({
      allDay: true,
      departmentId: null,
      description: "",
      endDate: "2026-07-14",
      endDateTime: "",
      eventType: "custom",
      inviteePlatformUserIds: [],
      location: "",
      meetingUrl: "",
      startDate: "2026-07-14",
      startDateTime: "",
      title: "Seguimiento",
      visibility: "invited",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["inviteePlatformUserIds"]);
    }
  });

  it("keeps specifically added employees for company events", () => {
    const inviteeId = "507f1f77bcf86cd799439011";
    const parsed = calendarEventInputSchema.parse({
      allDay: true,
      departmentId: null,
      description: "",
      endDate: "2026-07-14",
      endDateTime: "",
      eventType: "celebration",
      inviteePlatformUserIds: [inviteeId, inviteeId],
      location: "",
      meetingUrl: "",
      startDate: "2026-07-14",
      startDateTime: "",
      title: "Aniversario",
      visibility: "company",
    });

    expect(parsed.inviteePlatformUserIds).toEqual([inviteeId]);
    expect(parsed.eventType).toBe("celebration");
  });
});
