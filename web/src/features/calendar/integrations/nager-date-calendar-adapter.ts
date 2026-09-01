import "server-only";

import { z } from "zod";

import type { CalendarHolidayIntegration } from "@/features/calendar/integrations/calendar-holiday-port";

const costaRicaCountryCode = "CR";
const holidayCacheSeconds = 60 * 60 * 24;

const nagerDateHolidaySchema = z.object({
  countryCode: z.literal(costaRicaCountryCode),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  global: z.boolean(),
  localName: z.string().trim().min(1),
});

const nagerDateHolidaysSchema = z.array(nagerDateHolidaySchema);

export class CalendarHolidayIntegrationError extends Error {
  constructor() {
    super("Could not load Costa Rican public holidays from Nager.Date.");
    this.name = "CalendarHolidayIntegrationError";
  }
}

export const calendarHolidayIntegration: CalendarHolidayIntegration = {
  async listPublicHolidays(year) {
    try {
      const response = await fetch(
        `https://date.nager.at/api/v3/PublicHolidays/${year}/${costaRicaCountryCode}`,
        {
          headers: { Accept: "application/json" },
          next: { revalidate: holidayCacheSeconds },
          signal: AbortSignal.timeout(5_000),
        },
      );

      if (!response.ok) throw new CalendarHolidayIntegrationError();

      const result = nagerDateHolidaysSchema.safeParse(await response.json());
      if (!result.success) throw new CalendarHolidayIntegrationError();

      return result.data
        .filter((holiday) => holiday.global)
        .map((holiday) => ({
          date: holiday.date,
          name: holiday.localName.replace(/\s+/g, " "),
        }));
    } catch (error) {
      if (error instanceof CalendarHolidayIntegrationError) throw error;
      throw new CalendarHolidayIntegrationError();
    }
  },
};
