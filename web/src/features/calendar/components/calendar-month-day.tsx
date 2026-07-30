import { CakeSlice, CalendarDays } from "lucide-react";
import Link from "next/link";

import { type CalendarEntry } from "@/features/calendar/domain/calendar-entry";
import {
  createCalendarUrl,
  type CalendarQuery,
} from "@/features/calendar/domain/calendar-query";
import { formatCalendarDate } from "@/features/calendar/domain/calendar-utils";

import styles from "./calendar.module.css";

type CalendarMonthDayProps = {
  day: {
    day: number;
    inCurrentMonth: boolean;
    value: string;
  };
  entries: CalendarEntry[];
  isSelected: boolean;
  isToday: boolean;
  query: CalendarQuery;
};

export function CalendarMonthDay({
  day,
  entries,
  isSelected,
  isToday,
  query,
}: CalendarMonthDayProps) {
  const visibleEntries = entries.slice(0, 2);
  const remaining = entries.length - visibleEntries.length;
  const dayLabel = `${formatCalendarDate(day.value, true)}${
    entries.length
      ? `, ${entries.length} ${entries.length === 1 ? "evento" : "eventos"}`
      : ""
  }`;

  return (
    <div
      aria-label={dayLabel}
      className={styles.monthDay}
      data-current-month={day.inCurrentMonth}
      data-selected={isSelected}
      role="gridcell"
    >
      <Link
        aria-current={isToday ? "date" : undefined}
        className={styles.dayNumber}
        href={createCalendarUrl({
          day: day.value,
          month: day.inCurrentMonth ? query.month : day.value.slice(0, 7),
          view: "month",
        })}
      >
        <span aria-hidden="true">{day.day}</span>
        <span className="sr-only">{dayLabel}</span>
      </Link>
      <div aria-hidden="true" className={styles.mobileIndicators}>
        {visibleEntries.map((entry) => {
          const Icon = entry.kind === "birthday" ? CakeSlice : CalendarDays;
          return <Icon data-kind={entry.kind} key={entry.id} size={12} />;
        })}
      </div>
      <div className={styles.desktopPreviews}>
        {visibleEntries.map((entry) =>
          entry.detailHref ? (
            <Link
              className={styles.eventPreview}
              data-kind={entry.kind}
              href={entry.detailHref}
              key={entry.id}
            >
              {entry.title}
            </Link>
          ) : (
            <span className={styles.eventPreview} data-kind={entry.kind} key={entry.id}>
              {entry.title}
            </span>
          ),
        )}
        {remaining > 0 && (
          <Link
            className={styles.moreEvents}
            href={createCalendarUrl({
              day: day.value,
              month: query.month,
              view: "month",
            })}
          >
            Ver {remaining} más
          </Link>
        )}
      </div>
    </div>
  );
}
