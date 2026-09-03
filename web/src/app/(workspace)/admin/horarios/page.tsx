import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";

import { Container } from "@/components/ui/container/container";
import { PageSectionHeader } from "@/components/ui/page-section-header/page-section-header";
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
          <PageSectionHeader
            eyebrow="Administración"
            icon={CalendarClock}
            title="Horarios"
          />
        </header>

        <SchedulerDashboard {...dashboard} />
      </div>
    </Container>
  );
}
