import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import {
  groupCalendarAgendaEntries,
  type CalendarEntry,
} from "@/features/calendar/domain/calendar-entry";
import {
  formatCalendarDate,
  getCalendarMonthRange,
} from "@/features/calendar/domain/calendar-utils";

import { CalendarEntryItem } from "./calendar-entry-item";
import styles from "./calendar.module.css";

type CalendarAgendaProps = {
  entries: CalendarEntry[];
  month: string;
};

export function CalendarAgenda({ entries, month }: CalendarAgendaProps) {
  const groups = groupCalendarAgendaEntries(
    entries,
    getCalendarMonthRange(month).startDate,
  );

  if (groups.length === 0) {
    return (
      <ElevatedSurface as="section" className={styles.emptyState}>
        <h2>No hay actividades para este mes</h2>
        <p className={styles.muted}>
          Cuando haya cumpleaños, ausencias o eventos visibles, aparecerán aquí.
        </p>
      </ElevatedSurface>
    );
  }

  return (
    <section aria-label="Agenda del mes" className={styles.agenda}>
      {groups.map((group) => (
        <ElevatedSurface as="section" className={styles.agendaGroup} key={group.date}>
          <h2>{formatCalendarDate(group.date, true)}</h2>
          <div className={styles.entryList}>
            {group.entries.map((entry) => (
              <CalendarEntryItem entry={entry} key={entry.id} />
            ))}
          </div>
        </ElevatedSurface>
      ))}
    </section>
  );
}
