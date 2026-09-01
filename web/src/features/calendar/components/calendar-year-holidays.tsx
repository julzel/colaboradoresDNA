import { ChevronDown, Flag } from "lucide-react";

import { formatCalendarDate } from "@/features/calendar/domain/calendar-utils";
import type { CalendarHolidayView } from "@/features/calendar/view-models/calendar-holiday-view";

import styles from "./calendar.module.css";

type CalendarYearHolidaysProps = {
  holidays: CalendarHolidayView[];
  year: number;
};

function formatHolidayMonth(date: string) {
  return new Intl.DateTimeFormat("es-CR", {
    month: "long",
    timeZone: "UTC",
  })
    .format(new Date(`${date}T12:00:00.000Z`))
    .toLocaleUpperCase("es-CR");
}

function formatHolidayWeekday(date: string) {
  return new Intl.DateTimeFormat("es-CR", {
    timeZone: "UTC",
    weekday: "short",
  })
    .format(new Date(`${date}T12:00:00.000Z`))
    .replace(".", "")
    .toLocaleUpperCase("es-CR");
}

function capitalizeLabel(label: string) {
  return label.charAt(0).toLocaleUpperCase("es-CR") + label.slice(1);
}

export function CalendarYearHolidays({ holidays, year }: CalendarYearHolidaysProps) {
  const monthGroups = new Map<string, CalendarHolidayView[]>();

  for (const holiday of holidays) {
    const month = holiday.date.slice(0, 7);
    const group = monthGroups.get(month) ?? [];
    group.push(holiday);
    monthGroups.set(month, group);
  }

  return (
    <details className={styles.yearHolidays}>
      <summary className={styles.yearHolidaysSummary}>
        <span className={styles.yearHolidaysHeading}>
          <span aria-hidden="true" className={styles.yearHolidaysIcon}>
            <Flag size={19} />
          </span>
          <span>
            <strong className={styles.yearHolidaysTitle}>
              Feriados nacionales de {year}
            </strong>
            <small className={styles.yearHolidaysCount}>
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
        <div className={styles.yearHolidayGroups}>
          {[...monthGroups.entries()].map(([month, monthHolidays]) => (
            <section className={styles.yearHolidayMonth} key={month}>
              <h3 className={styles.yearHolidayMonthLabel}>
                {formatHolidayMonth(monthHolidays[0]?.date ?? `${month}-01`)}
              </h3>
              <ul>
                {monthHolidays.map((holiday) => {
                  const fullDate = capitalizeLabel(formatCalendarDate(holiday.date));

                  return (
                    <li key={`${holiday.date}:${holiday.name}`}>
                      <span aria-hidden="true" className={styles.yearHolidayDateTile}>
                        <strong>{holiday.date.slice(-2)}</strong>
                        <span className={styles.yearHolidayWeekday}>
                          {formatHolidayWeekday(holiday.date)}
                        </span>
                      </span>
                      <span className={styles.yearHolidayContent}>
                        <strong>{holiday.name}</strong>
                        <time dateTime={holiday.date}>{fullDate}</time>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className={styles.yearHolidaysEmpty}>
          No hay feriados nacionales disponibles para este año.
        </p>
      )}
    </details>
  );
}
