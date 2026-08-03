import type { CalendarEventType } from "@/features/calendar/domain/calendar-event";

export type DashboardNotification = {
  allDay: boolean;
  endDate: string;
  eventType: CalendarEventType | null;
  href: string;
  id: string;
  isUnread: boolean;
  key: string;
  kind: "event" | "pto";
  label: string;
  startDate: string;
  startsAt: string;
  title: string;
};
