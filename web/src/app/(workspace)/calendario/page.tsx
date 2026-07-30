import type { Metadata } from "next";

import { CalendarAgenda } from "@/features/calendar/components/calendar-agenda";
import { CalendarControls } from "@/features/calendar/components/calendar-controls";
import { CalendarMonth } from "@/features/calendar/components/calendar-month";
import styles from "@/features/calendar/components/calendar.module.css";
import { parseCalendarQuery } from "@/features/calendar/domain/calendar-query";
import { getCalendarEntries } from "@/features/calendar/server/calendar-service";

export const metadata: Metadata = { title: "Calendario" };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseCalendarQuery(await searchParams);
  const { canCreateEvents, entries, eventFormOptions } = await getCalendarEntries(
    query.month,
  );

  return (
    <div className={styles.page}>
      <CalendarControls
        canCreateEvents={canCreateEvents}
        eventFormOptions={eventFormOptions}
        query={query}
      />
      {query.view === "month" ? (
        <CalendarMonth entries={entries} query={query} />
      ) : (
        <CalendarAgenda entries={entries} month={query.month} />
      )}
    </div>
  );
}
