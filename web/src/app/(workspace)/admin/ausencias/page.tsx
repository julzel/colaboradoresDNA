import type { Metadata } from "next";
import { ChevronRight, ClipboardClock, Search } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/ui/container/container";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { TextField } from "@/components/ui/form-field/form-field";
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

type AdminPtoFilter = Exclude<PtoStatus, "draft"> | "all";

const filters: Array<{ label: string; value: AdminPtoFilter }> = [
  { label: "Todas", value: "all" },
  { label: "Pendientes", value: "pending" },
  { label: "Aprobadas", value: "approved" },
  { label: "Denegadas", value: "denied" },
  { label: "Canceladas", value: "cancelled" },
];

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

export default async function PtoAdministrationPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; nombre?: string }>;
}) {
  const [dashboard, query] = await Promise.all([
    getPtoAdministrationDashboard(),
    searchParams,
  ]);
  const parsedStatus = ptoStatusSchema.safeParse(query.estado);
  const selectedStatus =
    parsedStatus.success && parsedStatus.data !== "draft" ? parsedStatus.data : "all";
  const search = query.nombre?.trim() ?? "";
  const normalizedSearch = normalizeSearchText(search);
  const requests = dashboard.requests.filter(
    (request) =>
      (selectedStatus === "all" || request.status === selectedStatus) &&
      (!normalizedSearch ||
        normalizeSearchText(request.requesterName).includes(normalizedSearch)),
  );
  const filterCounts: Record<AdminPtoFilter, number> = {
    all: dashboard.requests.length,
    approved: dashboard.counts.approved,
    cancelled: dashboard.counts.cancelled,
    denied: dashboard.counts.denied,
    pending: dashboard.counts.pending,
  };

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

        <ElevatedSurface as="section" className={styles.adminRequestPanel}>
          <div className={styles.adminRequestHeader}>
            <h2>Solicitudes del equipo</h2>
          </div>

          <div className={styles.adminRequestToolbar}>
            <form className={styles.adminRequestSearchBar} method="get" role="search">
              {selectedStatus !== "all" ? (
                <input name="estado" type="hidden" value={selectedStatus} />
              ) : null}
              <Search
                aria-hidden="true"
                className={styles.adminRequestSearchIcon}
                size={19}
              />
              <TextField
                autoComplete="off"
                className={styles.adminRequestSearchInput}
                defaultValue={search}
                id="absence-request-search"
                label="Buscar solicitudes por nombre"
                name="nombre"
                placeholder="Buscar por nombre…"
                type="search"
                visuallyHiddenLabel
              />
            </form>

            <nav
              aria-label="Filtrar solicitudes"
              className={styles.adminRequestFilters}
            >
              {filters.map((filter) => {
                const isActive = selectedStatus === filter.value;
                const params = new URLSearchParams();

                if (filter.value !== "all") params.set("estado", filter.value);
                if (search) params.set("nombre", search);
                const filterHref = params.size
                  ? `/admin/ausencias?${params.toString()}`
                  : "/admin/ausencias";

                return (
                  <Link
                    aria-current={isActive ? "page" : undefined}
                    className={styles.adminRequestFilter}
                    data-active={isActive}
                    href={filterHref}
                    key={filter.value}
                  >
                    {filter.label}
                    <span className={styles.adminRequestFilterCount}>
                      {filterCounts[filter.value]}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <p aria-live="polite" className={styles.adminRequestResultCount}>
            {requests.length} solicitudes
          </p>

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
            <p className={styles.adminRequestEmpty}>
              No hay solicitudes con este estado.
            </p>
          )}
        </ElevatedSurface>
      </div>
    </Container>
  );
}
