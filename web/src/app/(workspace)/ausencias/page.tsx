import type { Metadata } from "next";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardClock,
  Clock3,
  TreePalm,
} from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/ui/container/container";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { PtoCategoryIcon } from "@/features/pto/components/pto-category-badge";
import { PtoRequestModal } from "@/features/pto/components/pto-request-modal";
import styles from "@/features/pto/components/pto.module.css";
import {
  formatPtoDateRange,
  formatPtoDays,
  ptoCategoryLabels,
  ptoStatusLabels,
  type PtoStatus,
} from "@/features/pto/domain/pto";
import { getPtoDashboard } from "@/features/pto/server/pto-service";

export const metadata: Metadata = { title: "Solicitudes de ausencia" };

const historyFilters = [
  { label: "Todas", value: "all" },
  { label: "Pendientes", value: "pending" },
  { label: "Aprobadas", value: "approved" },
  { label: "Rechazadas", value: "denied" },
  { label: "Canceladas", value: "cancelled" },
] as const;

type HistoryFilter = (typeof historyFilters)[number]["value"];

const statusTones: Record<PtoStatus, "danger" | "neutral" | "success" | "warning"> = {
  approved: "success",
  cancelled: "neutral",
  denied: "danger",
  draft: "neutral",
  pending: "warning",
};

const historyPageSize = 10;

function historyHref(filter: HistoryFilter, page = 1) {
  const query = new URLSearchParams();
  if (filter !== "all") query.set("estado", filter);
  if (page > 1) query.set("pagina", String(page));
  const search = query.toString();
  return search ? `/ausencias?${search}` : "/ausencias";
}

function formatSubmittedAt(value: Date | null) {
  if (!value) return null;
  return {
    date: new Intl.DateTimeFormat("es-CR", {
      day: "2-digit",
      month: "short",
      timeZone: "America/Costa_Rica",
      year: "numeric",
    })
      .format(value)
      .replaceAll(".", ""),
    time: new Intl.DateTimeFormat("es-CR", {
      hour: "2-digit",
      hour12: false,
      minute: "2-digit",
      timeZone: "America/Costa_Rica",
    }).format(value),
  };
}

export default async function PtoDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; pagina?: string }>;
}) {
  const [dashboard, query] = await Promise.all([getPtoDashboard(), searchParams]);
  const selectedFilter = historyFilters.some((filter) => filter.value === query.estado)
    ? (query.estado as HistoryFilter)
    : "all";
  const filteredRequests =
    selectedFilter === "all"
      ? dashboard.ownRequests
      : dashboard.ownRequests.filter((request) => request.status === selectedFilter);
  const requestedPage = Number.parseInt(query.pagina ?? "1", 10);
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / historyPageSize));
  const currentPage = Math.min(
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    totalPages,
  );
  const pageStart = (currentPage - 1) * historyPageSize;
  const visibleRequests = filteredRequests.slice(
    pageStart,
    pageStart + historyPageSize,
  );
  const pendingCount = dashboard.ownRequests.filter(
    (request) => request.status === "pending",
  ).length;

  return (
    <Container>
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.moduleTitle}>
              <span className={styles.moduleIcon}>
                <ClipboardClock aria-hidden="true" size={24} strokeWidth={1.8} />
              </span>
              <h1>Ausencias</h1>
              <div className={styles.moduleActions}>
                <PtoRequestModal />
              </div>
            </div>
          </div>
        </header>

        <section aria-label="Resumen de ausencias" className={styles.summaryCards}>
          <ElevatedSurface as="div" className={styles.summaryCard}>
            <span className={styles.summaryCardIcon} data-tone="vacation">
              <TreePalm aria-hidden="true" size={29} strokeWidth={1.8} />
            </span>
            <div className={styles.summaryCardContent}>
              <h2>Saldo de vacaciones</h2>
              <p className={styles.summaryMetric}>
                <strong>
                  {dashboard.balanceUnits === null
                    ? "—"
                    : formatPtoDays(dashboard.balanceUnits ?? 0)}
                </strong>
                <span>
                  {dashboard.balanceUnits === null
                    ? "saldo sin configurar"
                    : "días disponibles"}
                </span>
              </p>
            </div>
          </ElevatedSurface>

          <ElevatedSurface as="div" className={styles.summaryCard}>
            <span className={styles.summaryCardIcon} data-tone="pending">
              <Clock3 aria-hidden="true" size={29} strokeWidth={1.8} />
            </span>
            <div className={styles.summaryCardContent}>
              <h2>Solicitudes pendientes</h2>
              <p className={styles.summaryMetric}>
                <strong>{dashboard.pendingApprovals.length}</strong>
                <span>
                  {dashboard.pendingApprovals.length === 1
                    ? "solicitud"
                    : "solicitudes"}
                </span>
              </p>
            </div>
          </ElevatedSurface>
        </section>

        <ElevatedSurface as="section" className={styles.historyPanel}>
          <nav aria-label="Filtrar historial" className={styles.historyTabs}>
            {historyFilters.map((filter) => (
              <Link
                aria-current={selectedFilter === filter.value ? "page" : undefined}
                data-active={selectedFilter === filter.value}
                href={historyHref(filter.value)}
                key={filter.value}
              >
                {filter.label}
                {filter.value === "pending" ? ` (${pendingCount})` : ""}
              </Link>
            ))}
          </nav>

          <div aria-hidden="true" className={styles.historyTableHeader}>
            <span>Tipo de solicitud</span>
            <div>
              <span>Fechas</span>
              <span>Duración</span>
              <span>Estado</span>
              <span>Solicitado el</span>
            </div>
            <span />
          </div>

          {visibleRequests.length ? (
            <ul className={styles.historyList}>
              {visibleRequests.map((request) => {
                const submittedAt = formatSubmittedAt(request.submittedAt);
                return (
                  <li key={request.id}>
                    <Link
                      aria-label={`Ver solicitud de ${ptoCategoryLabels[request.category]}`}
                      className={styles.historyRow}
                      href={`/ausencias/${request.id}`}
                      scroll={false}
                    >
                      <div className={styles.historyRequestType}>
                        <PtoCategoryIcon category={request.category} />
                        <div>
                          <strong>{ptoCategoryLabels[request.category]}</strong>
                        </div>
                      </div>

                      <div className={styles.historyDetails}>
                        <div className={styles.historyCell} data-label="Fechas">
                          {formatPtoDateRange(request.startDate, request.endDate)}
                        </div>
                        <div className={styles.historyCell} data-label="Duración">
                          {formatPtoDays(request.durationUnits)}{" "}
                          {request.durationUnits === 2 ? "día" : "días"}
                        </div>
                        <div className={styles.historyCell} data-label="Estado">
                          <StatusBadge
                            className={styles.historyStatus}
                            tone={statusTones[request.status]}
                          >
                            {ptoStatusLabels[request.status]}
                          </StatusBadge>
                        </div>
                        <div className={styles.historyCell} data-label="Solicitado el">
                          {submittedAt ? (
                            <>
                              <span className={styles.historyTimestampValue}>
                                {submittedAt.date}
                              </span>
                              <span className={styles.historyTimestampValue}>
                                {submittedAt.time}
                              </span>
                            </>
                          ) : (
                            <span>Sin enviar</span>
                          )}
                        </div>
                      </div>

                      <ChevronRight
                        aria-hidden="true"
                        className={styles.historyChevron}
                        size={18}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={styles.historyEmpty}>No hay solicitudes en esta categoría.</p>
          )}

          <footer className={styles.historyFooter}>
            <span>
              {filteredRequests.length
                ? `${pageStart + 1}–${pageStart + visibleRequests.length} de ${filteredRequests.length}`
                : "0 de 0"}
            </span>
            <nav aria-label="Paginación del historial" className={styles.pagination}>
              {currentPage > 1 ? (
                <Link
                  aria-label="Página anterior"
                  href={historyHref(selectedFilter, currentPage - 1)}
                >
                  <ChevronLeft aria-hidden="true" size={18} />
                </Link>
              ) : (
                <span aria-hidden="true" data-disabled="true">
                  <ChevronLeft size={18} />
                </span>
              )}
              <span aria-current="page" className={styles.currentPage}>
                {currentPage}
              </span>
              {currentPage < totalPages ? (
                <Link
                  aria-label="Página siguiente"
                  href={historyHref(selectedFilter, currentPage + 1)}
                >
                  <ChevronRight aria-hidden="true" size={18} />
                </Link>
              ) : (
                <span aria-hidden="true" data-disabled="true">
                  <ChevronRight size={18} />
                </span>
              )}
            </nav>
          </footer>
        </ElevatedSurface>
      </div>
    </Container>
  );
}
