import {
  Building2,
  CalendarClock,
  Clock3,
  ExternalLink,
  MapPin,
  Pencil,
  Sprout,
  UserRound,
  UsersRound,
} from "lucide-react";

import { ButtonLink } from "@/components/ui/button/button";
import { DeleteCalendarEventForm } from "@/features/calendar/components/delete-calendar-event-form";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { calendarEventTypeLabels } from "@/features/calendar/domain/calendar-event";
import {
  formatCalendarDate,
  formatCalendarTime,
} from "@/features/calendar/domain/calendar-utils";
import type { CalendarEventDetail } from "@/features/calendar/server/calendar-event-repository";

import styles from "./calendar.module.css";

const visibilityLabels = {
  company: "Toda la empresa",
  department: "Departamento",
  invited: "Personas invitadas",
} as const;

function getEventSchedule(detail: CalendarEventDetail) {
  const { event } = detail;
  const date =
    event.startDate === event.endDate
      ? formatCalendarDate(event.startDate, true)
      : `${formatCalendarDate(event.startDate, true)} – ${formatCalendarDate(
          event.endDate,
          true,
        )}`;
  const time = event.allDay
    ? "Todo el día"
    : `${formatCalendarTime(event.startsAt)} – ${formatCalendarTime(event.endsAt)}`;

  return { date, time };
}

export function CalendarEventDetailContent({
  developmentHref,
  detail,
}: {
  developmentHref?: string | null;
  detail: CalendarEventDetail;
}) {
  const { event } = detail;
  const schedule = getEventSchedule(detail);

  return (
    <div className={styles.eventDetailContent} data-event-type={event.eventType}>
      <div className={styles.eventDetailOverview}>
        <span className={styles.eventTypeLabel} data-event-type={event.eventType}>
          {calendarEventTypeLabels[event.eventType]}
        </span>
        <StatusBadge tone="info">{visibilityLabels[event.visibility]}</StatusBadge>
      </div>

      <dl className={styles.eventDetailFacts}>
        <div>
          <dt>
            <CalendarClock aria-hidden="true" size={18} />
            Fecha
          </dt>
          <dd>{schedule.date}</dd>
        </div>
        <div>
          <dt>
            <Clock3 aria-hidden="true" size={18} />
            Hora
          </dt>
          <dd>{schedule.time}</dd>
        </div>
        <div>
          <dt>
            <UserRound aria-hidden="true" size={18} />
            Organiza
          </dt>
          <dd>{detail.organizerName}</dd>
        </div>
        {detail.departmentName && (
          <div>
            <dt>
              <Building2 aria-hidden="true" size={18} />
              Departamento
            </dt>
            <dd>{detail.departmentName}</dd>
          </div>
        )}
        {event.location && (
          <div>
            <dt>
              <MapPin aria-hidden="true" size={18} />
              Lugar
            </dt>
            <dd>{event.location}</dd>
          </div>
        )}
      </dl>

      {event.description && (
        <section className={styles.eventDetailSection}>
          <h2>Descripción</h2>
          <p className={styles.eventDetailDescription}>{event.description}</p>
        </section>
      )}

      {detail.invitees.length > 0 && (
        <details className={styles.eventInvitees}>
          <summary>
            <UsersRound aria-hidden="true" size={18} />
            {detail.invitees.length === 1
              ? "1 persona invitada"
              : `${detail.invitees.length} personas invitadas`}
          </summary>
          <ul>
            {detail.invitees.map((invitee) => (
              <li key={invitee.id}>{invitee.displayName}</li>
            ))}
          </ul>
        </details>
      )}

      {(event.meetingUrl || detail.canManage || developmentHref) && (
        <div className={styles.eventDetailActions}>
          {developmentHref && (
            <ButtonLink href={developmentHref}>
              <Sprout aria-hidden="true" size={17} />
              Abrir registro de desarrollo
            </ButtonLink>
          )}
          {event.meetingUrl && (
            <ButtonLink
              href={event.meetingUrl}
              rel="noreferrer"
              target="_blank"
              variant={developmentHref ? "secondary" : "primary"}
            >
              <ExternalLink aria-hidden="true" size={17} />
              Abrir enlace del evento
            </ButtonLink>
          )}
          {detail.canManage && (
            <ButtonLink
              href={`/calendario/eventos/${event.id}/editar`}
              variant={developmentHref ? "secondary" : "primary"}
            >
              <Pencil aria-hidden="true" size={17} />
              Editar evento
            </ButtonLink>
          )}
        </div>
      )}

      {detail.canDelete && (
        <DeleteCalendarEventForm
          eventId={event.id}
          month={event.startDate.slice(0, 7)}
        />
      )}
    </div>
  );
}
