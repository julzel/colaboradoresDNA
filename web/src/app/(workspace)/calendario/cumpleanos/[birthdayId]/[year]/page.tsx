import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { BackLink } from "@/components/ui/navigation/back-link";
import styles from "@/features/calendar/components/calendar.module.css";
import { CalendarBirthdayQuickDetailContent } from "@/features/calendar/components/calendar-quick-detail-content";
import { getVisibleCalendarBirthdayDetail } from "@/features/calendar/server/calendar-service";

export const metadata: Metadata = { title: "Cumpleaños en el calendario" };

export default async function CalendarBirthdayDetailPage({
  params,
}: {
  params: Promise<{ birthdayId: string; year: string }>;
}) {
  const { birthdayId, year } = await params;
  const detail = await getVisibleCalendarBirthdayDetail({
    birthdayId,
    year: Number(year),
  });
  if (!detail) notFound();

  return (
    <div className={styles.page}>
      <BackLink href="/calendario">Volver al calendario</BackLink>
      <ElevatedSurface as="section" className={styles.eventDetailPage}>
        <header className={styles.eventDetailPageHeader}>
          <h1>{detail.displayName}</h1>
        </header>
        <CalendarBirthdayQuickDetailContent detail={detail} />
      </ElevatedSurface>
    </div>
  );
}
