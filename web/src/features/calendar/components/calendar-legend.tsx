import type { CalendarEntry } from "@/features/calendar/domain/calendar-entry";

import {
  getCalendarEntryCategoryKey,
  getCalendarEntryCategoryLabel,
} from "./calendar-entry-presentation";
import styles from "./calendar.module.css";

type CalendarLegendProps = {
  entries: CalendarEntry[];
};

export function CalendarLegend({ entries }: CalendarLegendProps) {
  const categories = new Map<string, CalendarEntry>();

  for (const entry of entries) {
    const key = getCalendarEntryCategoryKey(entry);
    if (!categories.has(key)) categories.set(key, entry);
  }

  if (categories.size < 2) return null;

  return (
    <section aria-label="Leyenda del calendario" className={styles.calendarLegend}>
      {[...categories.entries()].map(([key, entry]) => (
        <span className={styles.legendItem} key={key}>
          <span
            aria-hidden="true"
            className={styles.legendDot}
            data-event-type={entry.eventType ?? undefined}
            data-kind={entry.kind}
          />
          {getCalendarEntryCategoryLabel(entry)}
        </span>
      ))}
    </section>
  );
}
