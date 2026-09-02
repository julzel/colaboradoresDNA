import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";

import { Container } from "@/components/ui/container/container";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { BackLink } from "@/components/ui/navigation/back-link";
import { OwnSchedule } from "@/features/scheduling/components/own-schedule";
import styles from "@/features/scheduling/components/schedule-detail.module.css";
import { getOwnSchedulePageData } from "@/features/scheduling/server/scheduler-query-service";

export const metadata: Metadata = { title: "Mi horario" };

export default async function OwnSchedulePage() {
  const schedule = await getOwnSchedulePageData();

  return (
    <Container>
      <div className={styles.page}>
        <BackLink href="/perfil">Volver a mi perfil</BackLink>
        <header className={styles.header}>
          <div>
            <p className="eyebrow">Cuenta personal</p>
            <div className={styles.title}>
              <span className={styles.titleIcon}>
                <CalendarClock aria-hidden="true" size={24} strokeWidth={1.8} />
              </span>
              <div>
                <h1>Mi horario</h1>
                <p>Consultá tus días y horas de trabajo.</p>
              </div>
            </div>
          </div>
        </header>

        <ElevatedSurface as="section" className={styles.currentCard}>
          <OwnSchedule schedule={schedule} />
        </ElevatedSurface>
      </div>
    </Container>
  );
}
