export type CalendarHoliday = {
  date: string;
  name: string;
};

export interface CalendarHolidayIntegration {
  listPublicHolidays(year: number): Promise<CalendarHoliday[]>;
}
