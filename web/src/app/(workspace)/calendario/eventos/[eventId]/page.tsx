import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { BackLink } from "@/components/ui/navigation/back-link";
import { CalendarEventDetailContent } from "@/features/calendar/components/calendar-event-detail-content";
import { DeleteCalendarEventForm } from "@/features/calendar/components/delete-calendar-event-form";
import styles from "@/features/calendar/components/calendar.module.css";
import { getVisibleCalendarEventDetail } from "@/features/calendar/server/calendar-service";

export const metadata: Metadata = { title: "Detalle del evento" };

export default async function CalendarEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const detail = await getVisibleCalendarEventDetail(eventId);
  if (!detail) notFound();
  const { event } = detail;

  return (
    <div className={styles.page}>
      <BackLink href={`/calendario?vista=agenda&mes=${event.startDate.slice(0, 7)}`}>
        Volver al calendario
      </BackLink>

      <ElevatedSurface as="section" className={styles.eventDetailPage}>
        <header className={styles.eventDetailPageHeader}>
          <h1>{event.title}</h1>
        </header>
        <CalendarEventDetailContent detail={detail} />
      </ElevatedSurface>

      {detail.canManage && (
        <DeleteCalendarEventForm
          eventId={event.id}
          month={event.startDate.slice(0, 7)}
        />
      )}
    </div>
  );
}
