import { afterEach, describe, expect, it, vi } from "vitest";

import {
  calendarHolidayIntegration,
  CalendarHolidayIntegrationError,
} from "@/features/calendar/integrations/nager-date-calendar-adapter";

vi.mock("server-only", () => ({}));

describe("Nager.Date calendar adapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads and maps Costa Rican public holidays", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            countryCode: "CR",
            date: "2026-07-25",
            global: true,
            localName: "Anexión   del Partido de Nicoya",
            name: "Annexation of the Party of Nicoya",
          },
          {
            countryCode: "CR",
            date: "2026-07-26",
            global: false,
            localName: "Feriado local",
            name: "Local holiday",
          },
          {
            countryCode: "CR",
            date: "2026-01-01",
            global: true,
            localName: "Año Nuevo",
            name: "New Year's Day",
          },
        ]),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(calendarHolidayIntegration.listPublicHolidays(2026)).resolves.toEqual([
      { date: "2026-01-01", name: "Año Nuevo" },
      { date: "2026-07-25", name: "Anexión del Partido de Nicoya" },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://date.nager.at/api/v3/PublicHolidays/2026/CR",
      expect.objectContaining({
        headers: { Accept: "application/json" },
        next: { revalidate: 2_592_000 },
      }),
    );
  });

  it("rejects unsuccessful or invalid provider responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ countryCode: "US", date: "invalid" }]), {
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      calendarHolidayIntegration.listPublicHolidays(2026),
    ).rejects.toBeInstanceOf(CalendarHolidayIntegrationError);
    await expect(
      calendarHolidayIntegration.listPublicHolidays(2026),
    ).rejects.toBeInstanceOf(CalendarHolidayIntegrationError);
  });

  it("normalizes malformed JSON and network failures to an integration error", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("not-json", { status: 200 }))
      .mockRejectedValueOnce(new TypeError("network unavailable"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      calendarHolidayIntegration.listPublicHolidays(2026),
    ).rejects.toBeInstanceOf(CalendarHolidayIntegrationError);
    await expect(
      calendarHolidayIntegration.listPublicHolidays(2026),
    ).rejects.toBeInstanceOf(CalendarHolidayIntegrationError);
  });
});
