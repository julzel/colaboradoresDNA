"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { ListToolbar } from "@/components/ui/list-toolbar/list-toolbar";
import { SearchField } from "@/components/ui/search-field/search-field";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import {
  formatPtoDateRange,
  formatPtoDays,
  ptoCategoryLabels,
  ptoStatusLabels,
  type PtoStatus,
} from "@/features/pto/domain/pto";
import type { PtoRequestView } from "@/features/pto/view-models/pto-view";

import { PtoCategoryIcon } from "./pto-category-badge";
import styles from "./pto.module.css";

type AdminPtoFilter = Exclude<PtoStatus, "draft"> | "all";

const filters: Array<{ label: string; value: AdminPtoFilter }> = [
  { label: "Todas", value: "all" },
  { label: "Pendientes", value: "pending" },
  { label: "Aprobadas", value: "approved" },
  { label: "Denegadas", value: "denied" },
  { label: "Canceladas", value: "cancelled" },
];

const statusTones = {
  approved: "success",
  cancelled: "neutral",
  denied: "danger",
  draft: "neutral",
  pending: "warning",
} as const;

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

export function PtoAdminRequestDirectory({
  initialFilter,
  requests,
}: {
  initialFilter: AdminPtoFilter;
  requests: PtoRequestView[];
}) {
  const [search, setSearch] = useState("");
  const normalizedSearch = normalizeSearchText(search.trim());
  const visibleRequests = useMemo(
    () =>
      requests.filter(
        (request) =>
          (initialFilter === "all" || request.status === initialFilter) &&
          (!normalizedSearch ||
            normalizeSearchText(request.requesterName).includes(normalizedSearch)),
      ),
    [initialFilter, normalizedSearch, requests],
  );
  const filterCounts: Record<AdminPtoFilter, number> = {
    all: requests.length,
    approved: requests.filter((request) => request.status === "approved").length,
    cancelled: requests.filter((request) => request.status === "cancelled").length,
    denied: requests.filter((request) => request.status === "denied").length,
    pending: requests.filter((request) => request.status === "pending").length,
  };

  return (
    <ElevatedSurface as="section" className={styles.adminRequestPanel}>
      <div className={styles.adminRequestHeader}>
        <h2>Solicitudes del equipo</h2>
      </div>

      <ListToolbar className={styles.adminRequestToolbar}>
        <SearchField
          autoComplete="off"
          className={styles.adminRequestSearchBar}
          id="absence-request-search"
          label="Buscar solicitudes por nombre"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre…"
          value={search}
        />

        <nav aria-label="Filtrar solicitudes" className={styles.adminRequestFilters}>
          {filters.map((filter) => {
            const isActive = initialFilter === filter.value;

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={styles.adminRequestFilter}
                data-active={isActive}
                href={
                  filter.value === "all"
                    ? "/admin/ausencias"
                    : `/admin/ausencias?estado=${filter.value}`
                }
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
      </ListToolbar>

      <p aria-live="polite" className={styles.adminRequestResultCount}>
        {visibleRequests.length} solicitudes
      </p>

      {visibleRequests.length ? (
        <ul className={styles.adminRequestList}>
          {visibleRequests.map((request) => (
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
          {search
            ? "No encontramos solicitudes para este nombre."
            : "No hay solicitudes con este estado."}
        </p>
      )}
    </ElevatedSurface>
  );
}
