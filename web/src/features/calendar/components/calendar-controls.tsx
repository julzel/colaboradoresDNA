import { ChevronLeft, ChevronRight } from "lucide-react";

import { ButtonLink } from "@/components/ui/button/button";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
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
import type { CalendarEventTargetOptions } from "@/features/calendar/server/calendar-event-repository";

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
      <h1 className="sr-only">Calendario</h1>

      {canCreateEvents && eventFormOptions && (
        <CalendarCreateEventTrigger options={eventFormOptions} />
      )}

      <ElevatedSurface as="section" className={styles.controls}>
        <div className={styles.periodNavigation}>
          <ButtonLink
            aria-label="Mes anterior"
            href={getAdjacentCalendarMonth(query, -1)}
            size="small"
            variant="quiet"
          >
            <ChevronLeft aria-hidden="true" size={20} />
          </ButtonLink>
          <h2 aria-live="polite">{formatCalendarMonth(query.month)}</h2>
          <ButtonLink
            aria-label="Mes siguiente"
            href={getAdjacentCalendarMonth(query, 1)}
            size="small"
            variant="quiet"
          >
            <ChevronRight aria-hidden="true" size={20} />
          </ButtonLink>
        </div>

        <div className={styles.controlActions}>
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
          <nav aria-label="Vista del calendario" className={styles.viewSelector}>
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
        </div>
      </ElevatedSurface>
    </header>
  );
}
