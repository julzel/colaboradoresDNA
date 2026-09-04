import type { Metadata } from "next";
import { ClipboardClock } from "lucide-react";

import { Container } from "@/components/ui/container/container";
import { MetricCard } from "@/components/ui/metric-card/metric-card";
import { PageSectionHeader } from "@/components/ui/page-section-header/page-section-header";
import { PtoAdminRequestDirectory } from "@/features/pto/components/pto-admin-request-directory";
import styles from "@/features/pto/components/pto.module.css";
import { ptoStatusSchema } from "@/features/pto/domain/pto";
import { getPtoAdministrationDashboard } from "@/features/pto/server/pto-service";

export const metadata: Metadata = { title: "Administrar ausencias" };

export default async function PtoAdministrationPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const [dashboard, query] = await Promise.all([
    getPtoAdministrationDashboard(),
    searchParams,
  ]);
  const parsedStatus = ptoStatusSchema.safeParse(query.estado);
  const selectedStatus =
    parsedStatus.success && parsedStatus.data !== "draft" ? parsedStatus.data : "all";

  return (
    <Container>
      <div className={styles.page}>
        <header className={styles.header}>
          <PageSectionHeader icon={ClipboardClock} title="Ausencias" />
        </header>

        <div className={styles.summaryGrid}>
          <MetricCard label="Pendientes" value={dashboard.counts.pending} />
          <MetricCard label="Aprobadas" value={dashboard.counts.approved} />
          <MetricCard
            label="Total gestionadas"
            value={
              dashboard.counts.approved +
              dashboard.counts.denied +
              dashboard.counts.cancelled
            }
          />
        </div>

        <PtoAdminRequestDirectory
          initialFilter={selectedStatus}
          requests={dashboard.requests}
        />
      </div>
    </Container>
  );
}
