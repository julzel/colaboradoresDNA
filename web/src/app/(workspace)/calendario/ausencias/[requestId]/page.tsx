import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ButtonLink } from "@/components/ui/button/button";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import styles from "@/features/calendar/components/calendar.module.css";
import { CalendarPtoQuickDetailContent } from "@/features/calendar/components/calendar-quick-detail-content";
import { getVisibleCalendarPtoDetail } from "@/features/calendar/server/calendar-service";

export const metadata: Metadata = { title: "Ausencia en el calendario" };

export default async function CalendarPtoDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const detail = await getVisibleCalendarPtoDetail(requestId);
  if (!detail) notFound();

  return (
    <div className={styles.page}>
      <ButtonLink href="/calendario" size="small" variant="quiet">
        ← Volver al calendario
      </ButtonLink>
      <ElevatedSurface as="section" className={styles.eventDetailPage}>
        <header className={styles.eventDetailPageHeader}>
          <h1>{detail.requesterName}</h1>
        </header>
        <CalendarPtoQuickDetailContent detail={detail} />
      </ElevatedSurface>
    </div>
  );
}
