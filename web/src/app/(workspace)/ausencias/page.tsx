import type { Metadata } from "next";
import { Plus } from "lucide-react";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button/button";
import { Container } from "@/components/ui/container/container";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { formatCalendarMonth } from "@/features/calendar/domain/calendar-utils";
import styles from "@/features/pto/components/pto.module.css";
import {
  formatPtoDateRange,
  formatPtoDays,
  ptoCategoryLabels,
  ptoStatusLabels,
} from "@/features/pto/domain/pto";
import {
  getPtoDashboard,
  type PtoRequestView,
} from "@/features/pto/server/pto-service";

export const metadata: Metadata = { title: "Solicitudes de ausencia" };

const statusTones = {
  approved: "success",
  cancelled: "neutral",
  denied: "danger",
  draft: "neutral",
  pending: "warning",
} as const;

function RequestList({
  empty,
  requests,
}: {
  empty: string;
  requests: PtoRequestView[];
}) {
  if (!requests.length) return <p className={styles.muted}>{empty}</p>;
  return (
    <ul className={styles.list}>
      {requests.map((request) => (
        <li className={styles.requestPeriodItem} key={request.id}>
          <p className={styles.requestPeriod}>
            {formatCalendarMonth(request.startDate.slice(0, 7))}
          </p>
          <div className={styles.requestCard}>
            <div>
              <p className={`${styles.muted} ${styles.requestDate}`}>
                {formatPtoDateRange(request.startDate, request.endDate)} ·{" "}
                {formatPtoDays(request.durationUnits)} días
              </p>
              <div className={styles.requestLinkRow}>
                <Link className={styles.requestLink} href={`/ausencias/${request.id}`}>
                  {ptoCategoryLabels[request.category]}
                </Link>
                <StatusBadge tone={statusTones[request.status]}>
                  {ptoStatusLabels[request.status]}
                </StatusBadge>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function PtoDashboardPage() {
  const dashboard = await getPtoDashboard();
  return (
    <Container>
      <main className={styles.page} id="main-content">
        <header className={styles.header}>
          <div className={styles.actions}>
            {dashboard.canManage && (
              <ButtonLink href="/admin/ausencias" variant="secondary">
                Administrar solicitudes
              </ButtonLink>
            )}
            {dashboard.canRequest && (
              <ButtonLink
                aria-label="Nueva solicitud"
                className={styles.newRequestButton}
                href="/ausencias/nueva"
              >
                <Plus aria-hidden="true" className={styles.newRequestIcon} size={22} />
                <span className={styles.newRequestLabel}>Nueva solicitud</span>
              </ButtonLink>
            )}
          </div>
        </header>

        <ElevatedSurface as="section" className={styles.dashboardSummary}>
          <div className={styles.summaryItem} data-summary="available">
            <p className={styles.summaryLabel}>Disponible</p>
            <p className={styles.summaryValue}>
              {!dashboard.canRequest
                ? "No aplica"
                : dashboard.balanceUnits === null
                  ? "Sin configurar"
                  : `${formatPtoDays(dashboard.balanceUnits)} días`}
            </p>
          </div>
          <div className={styles.summaryItem} data-summary="pending">
            <p className={styles.summaryLabel}>Pendientes</p>
            <p className={styles.summaryValue}>
              {
                dashboard.ownRequests.filter((request) => request.status === "pending")
                  .length
              }
            </p>
          </div>
          <div className={styles.summaryItem} data-summary="review">
            <p className={styles.summaryLabel}>Revisar</p>
            <p className={styles.summaryValue}>{dashboard.pendingApprovals.length}</p>
          </div>
        </ElevatedSurface>

        <div className={styles.twoColumns}>
          <section className={styles.requestSection}>
            <RequestList
              empty="Todavía no tenés solicitudes."
              requests={dashboard.ownRequests}
            />
          </section>
          <section className={styles.requestSection}>
            <h2>Solicitudes por revisar</h2>
            <RequestList
              empty="No tenés solicitudes pendientes de revisión."
              requests={dashboard.pendingApprovals}
            />
          </section>
        </div>
      </main>
    </Container>
  );
}
