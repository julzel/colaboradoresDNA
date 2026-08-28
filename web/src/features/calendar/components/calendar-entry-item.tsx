import { Clock3, MapPin } from "lucide-react";
import Link from "next/link";

import type { CalendarEntry } from "@/features/calendar/domain/calendar-entry";
import {
  formatCalendarDate,
  formatCalendarTime,
} from "@/features/calendar/domain/calendar-utils";

import { CalendarEntryIcon } from "./calendar-entry-presentation";
import styles from "./calendar.module.css";

type CalendarEntryItemProps = {
  entry: CalendarEntry;
  variant?: "compact" | "default";
};

function getTimeLabel(entry: CalendarEntry) {
  if (entry.allDay) {
    return entry.startDate === entry.endDate
      ? "Todo el día"
      : `${formatCalendarDate(entry.startDate)} – ${formatCalendarDate(entry.endDate)}`;
  }

  if (entry.startDate === entry.endDate) {
    return `${formatCalendarTime(entry.startAt)} – ${formatCalendarTime(entry.endAt)}`;
  }

  return `${formatCalendarDate(entry.startDate)} – ${formatCalendarDate(
    entry.endDate,
  )}`;
}

export function CalendarEntryItem({
  entry,
  variant = "default",
}: CalendarEntryItemProps) {
  const title = entry.detailHref ? (
    <Link href={entry.detailHref}>{entry.title}</Link>
  ) : (
    entry.title
  );

  return (
    <article
      className={styles.entry}
      data-event-type={entry.eventType ?? undefined}
      data-kind={entry.kind}
      data-variant={variant}
    >
      <span
        className={styles.entryIcon}
        data-event-type={entry.eventType ?? undefined}
        data-kind={entry.kind}
      >
        <CalendarEntryIcon aria-hidden="true" entry={entry} size={19} />
      </span>
      <div className={styles.entryContent}>
        <div className={styles.entryHeading}>
          <div>
            <span
              className={styles.entryLabel}
              data-event-type={entry.eventType ?? undefined}
              data-kind={entry.kind}
            >
              {entry.label}
            </span>
            <h3>{title}</h3>
          </div>
          {entry.canManage && <span className={styles.manageBadge}>Gestionable</span>}
        </div>
        <div className={styles.entryMeta}>
          <span>
            <Clock3 aria-hidden="true" size={15} />
            {getTimeLabel(entry)}
          </span>
          {entry.location && (
            <span>
              <MapPin aria-hidden="true" size={15} />
              {entry.location}
            </span>
          )}
        </div>
        {entry.note && <p className={styles.entryNote}>{entry.note}</p>}
      </div>
    </article>
  );
}
