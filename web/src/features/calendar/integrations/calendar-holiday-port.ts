import type { CalendarHolidayView } from "@/features/calendar/view-models/calendar-holiday-view";

export interface CalendarHolidayIntegration {
  listPublicHolidays(year: number): Promise<CalendarHolidayView[]>;
}
