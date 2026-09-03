import type { Metadata } from "next";
import { ChevronRight, ClipboardClock } from "lucide-react";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button/button";
import { Container } from "@/components/ui/container/container";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { MetricCard } from "@/components/ui/metric-card/metric-card";
import { PageSectionHeader } from "@/components/ui/page-section-header/page-section-header";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { PtoCategoryIcon } from "@/features/pto/components/pto-category-badge";
import styles from "@/features/pto/components/pto.module.css";
import {
  formatPtoDateRange,
  formatPtoDays,
  ptoCategoryLabels,
  ptoStatusLabels,
  ptoStatusSchema,
  type PtoStatus,
} from "@/features/pto/domain/pto";
import { getPtoAdministrationDashboard } from "@/features/pto/server/pto-service";

export const metadata: Metadata = { title: "Administrar ausencias" };

const statusTones = {
  approved: "success",
  cancelled: "neutral",
  denied: "danger",
  draft: "neutral",
  pending: "warning",
} as const;

const filters: Array<{ label: string; value: PtoStatus | "all" }> = [
  { label: "Todas", value: "all" },
  { label: "Pendientes", value: "pending" },
  { label: "Aprobadas", value: "approved" },
  { label: "Denegadas", value: "denied" },
  { label: "Canceladas", value: "cancelled" },
];

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
  const requests =
    selectedStatus === "all"
      ? dashboard.requests
      : dashboard.requests.filter((request) => request.status === selectedStatus);

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

        <nav aria-label="Filtrar solicitudes" className={styles.actions}>
          {filters.map((filter) => (
            <ButtonLink
              aria-current={selectedStatus === filter.value ? "page" : undefined}
              href={
                filter.value === "all"
                  ? "/admin/ausencias"
                  : `/admin/ausencias?estado=${filter.value}`
              }
              key={filter.value}
              size="small"
              variant={selectedStatus === filter.value ? "primary" : "secondary"}
            >
              {filter.label}
            </ButtonLink>
          ))}
        </nav>

        <ElevatedSurface as="section" className={styles.card}>
          <div className={styles.sectionHeader}>
            <h2>{filters.find((filter) => filter.value === selectedStatus)?.label}</h2>
            <span className={styles.muted}>{requests.length} solicitudes</span>
          </div>
          {requests.length ? (
            <ul className={styles.adminRequestList}>
              {requests.map((request) => (
                <li className={styles.adminRequestItem} key={request.id}>
                  <Link
                    aria-label={`Ver solicitud de ${request.requesterName}: ${ptoCategoryLabels[request.category]}`}
                    className={styles.adminRequestRow}
                    href={`/ausencias/${request.id}`}
                  >
                    <PtoCategoryIcon category={request.category} />

                    <div className={styles.adminRequestCopy}>
                      <div className={styles.adminRequestTitle}>
                        <strong>{request.requesterName}</strong>
                        <span>{ptoCategoryLabels[request.category]}</span>
                      </div>
                      <p className={styles.adminRequestMeta}>
                        <span>
                          {formatPtoDateRange(request.startDate, request.endDate)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {formatPtoDays(request.durationUnits)}{" "}
                          {request.durationUnits === 2 ? "día" : "días"}
                        </span>
                        {request.approverName ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{request.approverName}</span>
                          </>
                        ) : null}
                      </p>
                    </div>

                    <div className={styles.adminRequestAside}>
                      <StatusBadge tone={statusTones[request.status]}>
                        {ptoStatusLabels[request.status]}
                      </StatusBadge>
                      <ChevronRight
                        aria-hidden="true"
                        className={styles.adminRequestChevron}
                        size={18}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>No hay solicitudes con este estado.</p>
          )}
        </ElevatedSurface>
      </div>
    </Container>
  );
}
