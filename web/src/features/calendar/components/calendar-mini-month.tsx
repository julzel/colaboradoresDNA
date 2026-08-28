import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import {
  createCalendarUrl,
  getAdjacentCalendarMonth,
  type CalendarQuery,
} from "@/features/calendar/domain/calendar-query";
import {
  formatCalendarDate,
  formatCalendarMonth,
  getCalendarMonthDays,
} from "@/features/calendar/domain/calendar-utils";

import styles from "./calendar.module.css";

const weekdays = ["L", "M", "X", "J", "V", "S", "D"] as const;

type CalendarMiniMonthProps = {
  query: CalendarQuery;
  selectedDate: string;
  today: string;
};

export function CalendarMiniMonth({
  query,
  selectedDate,
  today,
}: CalendarMiniMonthProps) {
  return (
    <section aria-label="Navegación mensual" className={styles.miniCalendar}>
      <header className={styles.miniCalendarHeader}>
        <h2>{formatCalendarMonth(query.month)}</h2>
        <div>
          <Link
            aria-label="Mes anterior"
            className={styles.miniNavigationButton}
            href={getAdjacentCalendarMonth(query, -1)}
          >
            <ChevronLeft aria-hidden="true" size={17} />
          </Link>
          <Link
            aria-label="Mes siguiente"
            className={styles.miniNavigationButton}
            href={getAdjacentCalendarMonth(query, 1)}
          >
            <ChevronRight aria-hidden="true" size={17} />
          </Link>
        </div>
      </header>
      <div aria-hidden="true" className={styles.miniWeekdays}>
        {weekdays.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>
      <div className={styles.miniMonthGrid}>
        {getCalendarMonthDays(query.month).map((day) => (
          <Link
            aria-current={day.value === today ? "date" : undefined}
            aria-label={formatCalendarDate(day.value, true)}
            className={styles.miniDay}
            data-current-month={day.inCurrentMonth}
            data-selected={day.value === selectedDate}
            href={createCalendarUrl({
              day: day.value,
              month: day.inCurrentMonth ? query.month : day.value.slice(0, 7),
              view: "month",
            })}
            key={day.value}
          >
            <span aria-hidden="true">{day.day}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
