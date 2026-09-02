import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";

import { Container } from "@/components/ui/container/container";
import { SchedulerDashboard } from "@/features/scheduling/components/scheduler-dashboard";
import styles from "@/features/scheduling/components/scheduler-page.module.css";
import { getSchedulerDashboardPageData } from "@/features/scheduling/server/scheduler-query-service";

export const metadata: Metadata = { title: "Horarios" };

export default async function SchedulerPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const query = await searchParams;
  const dashboard = await getSchedulerDashboardPageData(query.fecha);

  return (
    <Container>
      <div className={styles.page}>
        <header className={styles.header}>
          <p className="eyebrow">Administración</p>
          <div className={styles.moduleTitle}>
            <span className={styles.moduleIcon}>
              <CalendarClock aria-hidden="true" size={24} strokeWidth={1.8} />
            </span>
            <div>
              <h1>Horarios</h1>
              <p>Visualizá la jornada vigente de todo el equipo.</p>
            </div>
          </div>
        </header>

        <SchedulerDashboard {...dashboard} />
      </div>
    </Container>
  );
}
