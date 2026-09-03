import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";

import { Container } from "@/components/ui/container/container";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { PageSectionHeader } from "@/components/ui/page-section-header/page-section-header";
import { OwnSchedule } from "@/features/scheduling/components/own-schedule";
import styles from "@/features/scheduling/components/schedule-detail.module.css";
import { getOwnSchedulePageData } from "@/features/scheduling/server/scheduler-query-service";

export const metadata: Metadata = { title: "Mi horario" };

export default async function OwnSchedulePage() {
  const schedule = await getOwnSchedulePageData();

  return (
    <Container>
      <div className={styles.page}>
        <header className={styles.header}>
          <PageSectionHeader icon={CalendarClock} title="Mi horario" />
        </header>

        <ElevatedSurface as="section" className={styles.currentCard}>
          <OwnSchedule schedule={schedule} />
        </ElevatedSurface>
      </div>
    </Container>
  );
}
