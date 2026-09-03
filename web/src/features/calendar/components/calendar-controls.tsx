import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { ButtonLink } from "@/components/ui/button/button";
import { PageSectionHeader } from "@/components/ui/page-section-header/page-section-header";
import { CalendarCreateEventTrigger } from "@/features/calendar/components/calendar-create-event-trigger";
import {
  createCalendarUrl,
  getAdjacentCalendarMonth,
  type CalendarQuery,
} from "@/features/calendar/domain/calendar-query";
import {
  formatCalendarMonth,
  getCurrentCalendarMonth,
} from "@/features/calendar/domain/calendar-utils";
import type { CalendarEventTargetOptions } from "@/features/calendar/view-models/calendar-event-view";

import styles from "./calendar.module.css";

type CalendarControlsProps = {
  canCreateEvents: boolean;
  eventFormOptions: CalendarEventTargetOptions | null;
  query: CalendarQuery;
};

export function CalendarControls({
  canCreateEvents,
  eventFormOptions,
  query,
}: CalendarControlsProps) {
  const currentMonth = getCurrentCalendarMonth();

  return (
    <header className={styles.pageHeader}>
      <PageSectionHeader icon={CalendarDays} title="Calendario" />

      <section aria-label="Controles del calendario" className={styles.controls}>
        <div className={styles.calendarToolbarStart}>
          <ButtonLink
            href={createCalendarUrl({
              month: currentMonth,
              view: query.view,
            })}
            size="small"
            variant="secondary"
          >
            Hoy
          </ButtonLink>
          <div className={styles.periodNavigation}>
            <ButtonLink
              aria-label="Mes anterior"
              className={`${styles.periodButton} ${styles.periodPrevious}`}
              href={getAdjacentCalendarMonth(query, -1)}
              size="small"
              variant="secondary"
            >
              <ChevronLeft aria-hidden="true" size={20} />
            </ButtonLink>
            <ButtonLink
              aria-label="Mes siguiente"
              className={`${styles.periodButton} ${styles.periodNext}`}
              href={getAdjacentCalendarMonth(query, 1)}
              size="small"
              variant="secondary"
            >
              <ChevronRight aria-hidden="true" size={20} />
            </ButtonLink>
          </div>
          <h2 aria-live="polite">{formatCalendarMonth(query.month)}</h2>
        </div>

        <div className={styles.controlActions}>
          <nav
            aria-label="Vista del calendario"
            className={styles.viewSelector}
            data-view={query.view}
          >
            <ButtonLink
              aria-current={query.view === "agenda" ? "page" : undefined}
              href={createCalendarUrl({
                month: query.month,
                view: "agenda",
              })}
              size="small"
              variant="quiet"
            >
              Agenda
            </ButtonLink>
            <ButtonLink
              aria-current={query.view === "month" ? "page" : undefined}
              href={createCalendarUrl({
                day: query.day,
                month: query.month,
                view: "month",
              })}
              size="small"
              variant="quiet"
            >
              Mes
            </ButtonLink>
          </nav>
          {query.view !== "month" && canCreateEvents && eventFormOptions && (
            <CalendarCreateEventTrigger
              className={styles.createEventButton}
              label="Nuevo evento"
              options={eventFormOptions}
            />
          )}
        </div>
      </section>
    </header>
  );
}
