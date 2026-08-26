import type { CalendarEvent } from "@/features/calendar/domain/calendar-event";

export type CalendarEventTargetOptions = {
  departments: Array<{ id: string; name: string }>;
  people: Array<{ displayName: string; id: string }>;
};

export type CalendarEventDetail = {
  canDelete: boolean;
  canManage: boolean;
  departmentName: string | null;
  event: CalendarEvent;
  invitees: Array<{ displayName: string; id: string }>;
  organizerName: string;
};
