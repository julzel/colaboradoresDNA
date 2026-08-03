import type { Metadata } from "next";
import {
  Building2,
  CalendarClock,
  Clock3,
  ExternalLink,
  MapPin,
  Pencil,
  UserRound,
  UsersRound,
} from "lucide-react";
import { notFound } from "next/navigation";

import { ButtonLink } from "@/components/ui/button/button";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { DeleteCalendarEventForm } from "@/features/calendar/components/delete-calendar-event-form";
import styles from "@/features/calendar/components/calendar.module.css";
import { calendarEventTypeLabels } from "@/features/calendar/domain/calendar-event";
import {
  formatCalendarDate,
  formatCalendarTime,
} from "@/features/calendar/domain/calendar-utils";
import { getVisibleCalendarEventDetail } from "@/features/calendar/server/calendar-service";

export const metadata: Metadata = { title: "Detalle del evento" };

const visibilityLabels = {
  company: "Toda la empresa",
  department: "Departamento",
  invited: "Personas invitadas",
} as const;

export default async function CalendarEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const detail = await getVisibleCalendarEventDetail(eventId);
  if (!detail) notFound();
  const { event } = detail;
  const dateText =
    event.startDate === event.endDate
      ? formatCalendarDate(event.startDate, true)
      : `${formatCalendarDate(event.startDate, true)} – ${formatCalendarDate(
          event.endDate,
          true,
        )}`;
  const timeText = event.allDay
    ? "Todo el día"
    : `${formatCalendarTime(event.startsAt)} – ${formatCalendarTime(event.endsAt)}`;

  return (
    <div className={styles.page}>
      <ButtonLink
        href={`/calendario?vista=agenda&mes=${event.startDate.slice(0, 7)}`}
        size="small"
        variant="quiet"
      >
        ← Volver al calendario
      </ButtonLink>

      <ElevatedSurface as="header" className={styles.eventDetailHeader}>
        <div>
          <p className="eyebrow">{calendarEventTypeLabels[event.eventType]}</p>
          <h1>{event.title}</h1>
          <StatusBadge tone="info">{visibilityLabels[event.visibility]}</StatusBadge>
        </div>
        {detail.canManage && (
          <ButtonLink
            href={`/calendario/eventos/${eventId}/editar`}
            variant="secondary"
          >
            <Pencil aria-hidden="true" size={17} />
            Editar evento
          </ButtonLink>
        )}
      </ElevatedSurface>

      <div className={styles.detailLayout}>
        <ElevatedSurface as="section" className={styles.detailCard}>
          <h2>Información</h2>
          <dl className={styles.detailList}>
            <div>
              <dt>
                <CalendarClock aria-hidden="true" size={18} />
                Fecha
              </dt>
              <dd>{dateText}</dd>
            </div>
            <div>
              <dt>
                <Clock3 aria-hidden="true" size={18} />
                Hora
              </dt>
              <dd>{timeText}</dd>
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
            {event.meetingUrl && (
              <div>
                <dt>
                  <ExternalLink aria-hidden="true" size={18} />
                  Enlace
                </dt>
                <dd>
                  <a
                    className={styles.detailLink}
                    href={event.meetingUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Abrir enlace de reunión
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </ElevatedSurface>

        <ElevatedSurface as="section" className={styles.detailCard}>
          <h2>Descripción</h2>
          <p className={styles.description}>
            {event.description ?? "No se agregó una descripción."}
          </p>
        </ElevatedSurface>

        {detail.invitees.length > 0 && (
          <ElevatedSurface as="section" className={styles.detailCard}>
            <h2>
              <UsersRound aria-hidden="true" size={19} />
              Personas invitadas
            </h2>
            <ul className={styles.inviteeList}>
              {detail.invitees.map((invitee) => (
                <li key={invitee.id}>{invitee.displayName}</li>
              ))}
            </ul>
          </ElevatedSurface>
        )}
      </div>

      {detail.canManage && (
        <DeleteCalendarEventForm
          eventId={event.id}
          month={event.startDate.slice(0, 7)}
        />
      )}
    </div>
  );
}
