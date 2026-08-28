import type { Metadata } from "next";
import { ClipboardClock } from "lucide-react";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button/button";
import { Container } from "@/components/ui/container/container";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { PtoCategoryBadge } from "@/features/pto/components/pto-category-badge";
import styles from "@/features/pto/components/pto.module.css";
import {
  formatPtoDays,
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
          <div>
            <p className="eyebrow">Administración</p>
            <div className={styles.moduleTitle}>
              <span className={styles.moduleIcon}>
                <ClipboardClock aria-hidden="true" size={24} strokeWidth={1.8} />
              </span>
              <h1>Ausencias</h1>
            </div>
          </div>
        </header>

        <div className={styles.summaryGrid}>
          <ElevatedSurface className={styles.card}>
            <p className="eyebrow">Pendientes</p>
            <p className={styles.metric}>{dashboard.counts.pending}</p>
          </ElevatedSurface>
          <ElevatedSurface className={styles.card}>
            <p className="eyebrow">Aprobadas</p>
            <p className={styles.metric}>{dashboard.counts.approved}</p>
          </ElevatedSurface>
          <ElevatedSurface className={styles.card}>
            <p className="eyebrow">Total gestionadas</p>
            <p className={styles.metric}>
              {dashboard.counts.approved +
                dashboard.counts.denied +
                dashboard.counts.cancelled}
            </p>
          </ElevatedSurface>
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
            <ul className={styles.list}>
              {requests.map((request) => (
                <li className={styles.requestItem} key={request.id}>
                  <div>
                    <Link
                      className={styles.requestLink}
                      href={`/ausencias/${request.id}`}
                    >
                      {request.requesterName} ·{" "}
                      <PtoCategoryBadge category={request.category} />
                    </Link>
                    <p className={styles.muted}>
                      {request.startDate} a {request.endDate} ·{" "}
                      {formatPtoDays(request.durationUnits)} días
                      {request.approverName ? ` · ${request.approverName}` : ""}
                    </p>
                  </div>
                  <div className={styles.actions}>
                    <StatusBadge tone={statusTones[request.status]}>
                      {ptoStatusLabels[request.status]}
                    </StatusBadge>
                    <ButtonLink
                      href={`/ausencias/${request.id}`}
                      size="small"
                      variant={request.status === "pending" ? "primary" : "quiet"}
                    >
                      {request.status === "pending" ? "Revisar" : "Ver detalle"}
                    </ButtonLink>
                  </div>
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
