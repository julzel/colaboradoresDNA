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
import type { CalendarEventTargetOptions } from "@/features/calendar/view-models/calendar-event-view";

import { CalendarCreateEventTrigger } from "./calendar-create-event-trigger";
import { CalendarEntryItem } from "./calendar-entry-item";
import { CalendarLegend } from "./calendar-legend";
import { CalendarMiniMonth } from "./calendar-mini-month";
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
  canCreateEvents?: boolean;
  entries: CalendarEntry[];
  eventFormOptions?: CalendarEventTargetOptions | null;
  query: CalendarQuery;
};

export function CalendarMonth({
  canCreateEvents = false,
  entries,
  eventFormOptions = null,
  query,
}: CalendarMonthProps) {
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
  const formattedSelectedDate = formatCalendarDate(selectedDate, true);
  const selectedDateLabel =
    formattedSelectedDate.charAt(0).toLocaleUpperCase("es-CR") +
    formattedSelectedDate.slice(1);

  return (
    <div className={styles.monthLayout}>
      <div className={styles.monthMain}>
        <ElevatedSurface as="section" className={styles.monthSurface}>
          <h2 className="sr-only">Vista mensual</h2>
          <div aria-label="Días de la semana" className={styles.weekdayGrid} role="row">
            {weekdays.map((weekday) => (
              <span aria-label={weekday.long} key={weekday.long} role="columnheader">
                <span aria-hidden="true" className={styles.weekdayShort}>
                  {weekday.short}
                </span>
                <span aria-hidden="true" className={styles.weekdayLong}>
                  {weekday.long.slice(0, 3)}
                </span>
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
        <CalendarLegend entries={entries} />
      </div>

      <aside aria-label="Detalle del día" className={styles.monthSidebar}>
        <ElevatedSurface as="section" className={styles.selectedDay}>
          <header className={styles.selectedDayHeader}>
            <h2>{selectedDateLabel}</h2>
            <p>
              {selectedEntries.length}{" "}
              {selectedEntries.length === 1 ? "evento" : "eventos"}
            </p>
          </header>
          {selectedEntries.length ? (
            <div className={styles.entryList}>
              {selectedEntries.map((entry) => (
                <CalendarEntryItem entry={entry} key={entry.id} variant="compact" />
              ))}
            </div>
          ) : (
            <p className={styles.muted}>No hay actividades para este día.</p>
          )}
          {canCreateEvents && eventFormOptions && (
            <CalendarCreateEventTrigger
              className={styles.selectedDayCreateButton}
              fullWidth
              label="Nuevo evento"
              options={eventFormOptions}
              variant="secondary"
            />
          )}
        </ElevatedSurface>
        <ElevatedSurface as="div" className={styles.miniCalendarSurface}>
          <CalendarMiniMonth query={query} selectedDate={selectedDate} today={today} />
        </ElevatedSurface>
      </aside>
    </div>
  );
}
