import { ArrowRight, CakeSlice, CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";

import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import type { CalendarEntry } from "@/features/calendar/domain/calendar-entry";
import { formatCalendarTime } from "@/features/calendar/domain/calendar-utils";
import { getDisplayNameInitials } from "@/features/employees/domain/employee";

import styles from "./dashboard-highlights.module.css";

type DashboardHighlightsProps = {
  showAgenda?: boolean;
  today: string;
  todayAgenda: CalendarEntry[];
  upcomingBirthdays: CalendarEntry[];
};

function formatDuration(entry: CalendarEntry) {
  const minutes = Math.max(
    0,
    Math.round(
      (new Date(entry.endAt).getTime() - new Date(entry.startAt).getTime()) / 60000,
    ),
  );
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours} h`;
  return `${hours} h ${remainingMinutes} min`;
}

function capitalize(value: string) {
  return value.charAt(0).toLocaleUpperCase("es-CR") + value.slice(1);
}

function formatBirthdayDate(date: string, today: string) {
  if (date === today) return "Hoy";

  const formatted = new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    weekday: "short",
  })
    .format(new Date(`${date}T12:00:00.000Z`))
    .replaceAll(".", "");

  return capitalize(formatted);
}

export function DashboardHighlights({
  showAgenda = true,
  today,
  todayAgenda,
  upcomingBirthdays,
}: DashboardHighlightsProps) {
  return (
    <section
      aria-label="Resumen del día"
      className={styles.grid}
      data-show-agenda={showAgenda}
    >
      {showAgenda && (
        <ElevatedSurface as="section" className={styles.panel}>
          <header className={styles.panelHeader}>
            <div className={styles.panelTitle}>
              <CalendarDays aria-hidden="true" size={24} strokeWidth={1.8} />
              <h2>Agenda de hoy</h2>
            </div>
            <Link className={styles.headerLink} href="/calendario?vista=agenda">
              Ver calendario
              <ArrowRight aria-hidden="true" size={17} />
            </Link>
          </header>

          {todayAgenda.length === 0 ? (
            <p className={styles.empty}>No hay eventos programados para hoy.</p>
          ) : (
            <ol className={styles.agendaList}>
              {todayAgenda.map((entry) => (
                <li className={styles.agendaItem} key={entry.id}>
                  <time dateTime={entry.startAt}>
                    {entry.allDay ? "Todo el día" : formatCalendarTime(entry.startAt)}
                  </time>
                  <span aria-hidden="true" className={styles.timelineMarker} />
                  <Link
                    className={styles.agendaCard}
                    href={entry.detailHref ?? "/calendario"}
                  >
                    <span className={styles.agendaDetails}>
                      <strong>{entry.title}</strong>
                      <span className={styles.meta}>
                        {entry.location && <MapPin aria-hidden="true" size={14} />}
                        {entry.location ?? entry.label}
                      </span>
                    </span>
                    {!entry.allDay && (
                      <span className={styles.duration}>{formatDuration(entry)}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </ElevatedSurface>
      )}

      <ElevatedSurface as="section" className={styles.panel}>
        <header className={styles.panelHeader}>
          <div className={styles.panelTitle}>
            <CakeSlice aria-hidden="true" size={24} strokeWidth={1.8} />
            <h2>Cumpleaños próximos</h2>
          </div>
        </header>

        {upcomingBirthdays.length === 0 ? (
          <p className={styles.empty}>No hay cumpleaños próximos para mostrar.</p>
        ) : (
          <ul className={styles.birthdayList}>
            {upcomingBirthdays.map((entry) => (
              <li key={entry.id}>
                <Link
                  className={styles.birthdayRow}
                  href={entry.detailHref ?? "/calendario"}
                >
                  <span aria-hidden="true" className={styles.avatar}>
                    {getDisplayNameInitials(entry.title)}
                  </span>
                  <span className={styles.person}>
                    <strong>{entry.title}</strong>
                    <span>Cumpleaños</span>
                  </span>
                  <CakeSlice aria-hidden="true" className={styles.rowIcon} size={17} />
                  <time
                    className={styles.datePill}
                    data-today={entry.startDate === today}
                    dateTime={entry.startDate}
                  >
                    {formatBirthdayDate(entry.startDate, today)}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </ElevatedSurface>
    </section>
  );
}
