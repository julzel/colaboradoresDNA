import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { BackLink } from "@/components/ui/navigation/back-link";
import { CalendarEventForm } from "@/features/calendar/components/calendar-event-form";
import styles from "@/features/calendar/components/calendar.module.css";
import {
  getCalendarEventFormOptions,
  getVisibleCalendarEventDetail,
} from "@/features/calendar/server/calendar-service";

export const metadata: Metadata = { title: "Editar evento" };

export default async function EditCalendarEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const detail = await getVisibleCalendarEventDetail(eventId);
  if (!detail) notFound();
  if (!detail.canManage) redirect("/access-denied?reason=forbidden");
  const options = await getCalendarEventFormOptions();
  const cancelHref = `/calendario/eventos/${eventId}`;

  return (
    <div className={styles.page}>
      <BackLink href={cancelHref}>Volver al evento</BackLink>
      <header className={styles.heading}>
        <p className="eyebrow">Calendario</p>
        <h1>Editar evento</h1>
        <p>
          {detail.developmentLink
            ? "Actualizá la fecha y la hora. La privacidad se protege desde Desarrollo."
            : "Actualizá la información o la visibilidad del evento."}
        </p>
      </header>
      <CalendarEventForm
        cancelHref={cancelHref}
        developmentOneOnOne={Boolean(detail.developmentLink)}
        event={detail.event}
        mode="edit"
        options={options}
      />
    </div>
  );
}
