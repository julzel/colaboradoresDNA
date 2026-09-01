import { ChevronDown, Flag } from "lucide-react";

import { formatCalendarDate } from "@/features/calendar/domain/calendar-utils";
import type { CalendarHolidayView } from "@/features/calendar/view-models/calendar-holiday-view";

import styles from "./calendar.module.css";

type CalendarYearHolidaysProps = {
  holidays: CalendarHolidayView[];
  year: number;
};

export function CalendarYearHolidays({ holidays, year }: CalendarYearHolidaysProps) {
  return (
    <details className={styles.yearHolidays}>
      <summary className={styles.yearHolidaysSummary}>
        <span className={styles.yearHolidaysHeading}>
          <span aria-hidden="true" className={styles.yearHolidaysIcon}>
            <Flag size={19} />
          </span>
          <span>
            <strong>Feriados nacionales de {year}</strong>
            <small>
              {holidays.length} {holidays.length === 1 ? "feriado" : "feriados"}
            </small>
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={styles.yearHolidaysChevron}
          size={20}
        />
      </summary>

      {holidays.length ? (
        <ul className={styles.yearHolidaysList}>
          {holidays.map((holiday) => (
            <li key={`${holiday.date}:${holiday.name}`}>
              <time dateTime={holiday.date}>{formatCalendarDate(holiday.date)}</time>
              <span className={styles.yearHolidayName}>{holiday.name}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.yearHolidaysEmpty}>
          No hay feriados nacionales disponibles para este año.
        </p>
      )}
    </details>
  );
}
