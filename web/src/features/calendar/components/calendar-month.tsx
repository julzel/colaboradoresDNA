import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import {
  calendarEntryOccursOn,
  type CalendarEntry,
} from "@/features/calendar/domain/calendar-entry";
import type { CalendarQuery } from "@/features/calendar/domain/calendar-query";
import {
  formatCalendarDate,
  getCalendarMonthDays,
  getTodayInCostaRica,
} from "@/features/calendar/domain/calendar-utils";

import { CalendarEntryItem } from "./calendar-entry-item";
import { CalendarMonthDay } from "./calendar-month-day";
import styles from "./calendar.module.css";

const weekdays = [
  { long: "Lunes", short: "L" },
  { long: "Martes", short: "M" },
  { long: "Miércoles", short: "X" },
  { long: "Jueves", short: "J" },
  { long: "Viernes", short: "V" },
  { long: "Sábado", short: "S" },
  { long: "Domingo", short: "D" },
] as const;

type CalendarMonthProps = {
  entries: CalendarEntry[];
  query: CalendarQuery;
};

export function CalendarMonth({ entries, query }: CalendarMonthProps) {
  const today = getTodayInCostaRica();
  const selectedDate =
    query.day ??
    (today.startsWith(`${query.month}-`)
      ? today
      : (entries.find((entry) => entry.startDate.startsWith(`${query.month}-`))
          ?.startDate ?? `${query.month}-01`));
  const selectedEntries = entries.filter((entry) =>
    calendarEntryOccursOn(entry, selectedDate),
  );

  return (
    <div className={styles.monthLayout}>
      <ElevatedSurface as="section" className={styles.monthSurface}>
        <h2 className="sr-only">Vista mensual</h2>
        <div aria-label="Días de la semana" className={styles.weekdayGrid} role="row">
          {weekdays.map((weekday) => (
            <span aria-label={weekday.long} key={weekday.long} role="columnheader">
              <span aria-hidden="true">{weekday.short}</span>
            </span>
          ))}
        </div>
        <div aria-label="Calendario mensual" className={styles.monthGrid} role="grid">
          {getCalendarMonthDays(query.month).map((day) => (
            <CalendarMonthDay
              day={day}
              entries={entries.filter((entry) =>
                calendarEntryOccursOn(entry, day.value),
              )}
              isSelected={day.value === selectedDate}
              isToday={day.value === today}
              key={day.value}
              query={query}
            />
          ))}
        </div>
      </ElevatedSurface>

      <ElevatedSurface as="section" className={styles.selectedDay}>
        <h2>{formatCalendarDate(selectedDate, true)}</h2>
        {selectedEntries.length ? (
          <div className={styles.entryList}>
            {selectedEntries.map((entry) => (
              <CalendarEntryItem entry={entry} key={entry.id} />
            ))}
          </div>
        ) : (
          <p className={styles.muted}>No hay actividades para este día.</p>
        )}
      </ElevatedSurface>
    </div>
  );
}
