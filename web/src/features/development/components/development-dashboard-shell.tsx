"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  MessageSquareText,
  Search,
  Sprout,
  UserPlus,
} from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/button/button";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { PageSectionHeader } from "@/components/ui/page-section-header/page-section-header";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import {
  getDevelopmentDirectoryStatus,
  type DevelopmentDirectory,
  type DevelopmentDirectoryItem,
  type DevelopmentDirectoryStatus,
} from "@/features/development/domain/development-directory";

import styles from "./development-dashboard-shell.module.css";

type EmploymentFilter = "active" | "all" | "inactive";

const statusLabels: Record<DevelopmentDirectoryStatus, string> = {
  current: "Al día",
  due: "Seguimiento vencido",
  never: "Sin primer 1:1",
};

const statusTones = {
  current: "success",
  due: "danger",
  never: "warning",
} as const;

const urgencyOrder: Record<DevelopmentDirectoryStatus, number> = {
  due: 0,
  never: 1,
  current: 2,
};

function formatDate(value: string | null, fallback: string) {
  if (!value) return fallback;
  return new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function getInitials(displayName: string) {
  return displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("es-CR");
}

function formatOpenActions(item: DevelopmentDirectoryItem) {
  if (item.openActionCount === 0) return "Sin acciones abiertas";

  return `${item.openActionCount} ${item.openActionCount === 1 ? "abierta" : "abiertas"}`;
}

function getItemUrgency(item: DevelopmentDirectoryItem, today: string) {
  if (item.employmentStatus !== "active") return 3;
  return urgencyOrder[getDevelopmentDirectoryStatus(item, today)];
}

function FollowUpStatus({
  item,
  today,
}: {
  item: DevelopmentDirectoryItem;
  today: string;
}) {
  if (item.employmentStatus !== "active") {
    return <StatusBadge tone="neutral">Inactivo · solo consulta</StatusBadge>;
  }

  const itemStatus = getDevelopmentDirectoryStatus(item, today);
  return (
    <StatusBadge tone={statusTones[itemStatus]}>{statusLabels[itemStatus]}</StatusBadge>
  );
}

function DevelopmentActions({ item }: { item: DevelopmentDirectoryItem }) {
  return (
    <div className={styles.actions}>
      {item.employmentStatus === "active" ? (
        <ButtonLink
          aria-label={`Registrar 1:1 con ${item.displayName}`}
          href={`/admin/colaboradores/${item.employeeId}/desarrollo/1-a-1/nueva`}
          size="medium"
        >
          Registrar 1:1
        </ButtonLink>
      ) : null}
      <ButtonLink
        aria-label={`Ver desarrollo de ${item.displayName}`}
        href={`/admin/colaboradores/${item.employeeId}/desarrollo`}
        size="medium"
        variant="secondary"
      >
        Ver desarrollo
      </ButtonLink>
    </div>
  );
}

export function DevelopmentDashboardShell({
  directory,
}: {
  directory: DevelopmentDirectory;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<DevelopmentDirectoryStatus | "all">("all");
  const [employment, setEmployment] = useState<EmploymentFilter>("active");
  const activeItems = directory.items.filter(
    (item) => item.employmentStatus === "active",
  );
  const statusCounts = activeItems.reduce<Record<DevelopmentDirectoryStatus, number>>(
    (counts, item) => {
      counts[getDevelopmentDirectoryStatus(item, directory.today)] += 1;
      return counts;
    },
    { current: 0, due: 0, never: 0 },
  );
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es-CR");

    return directory.items
      .filter((item) => {
        const itemStatus = getDevelopmentDirectoryStatus(item, directory.today);
        const matchesEmployment =
          employment === "all" || item.employmentStatus === employment;
        const matchesStatus =
          status === "all" ||
          (item.employmentStatus === "active" && itemStatus === status);
        const searchable = [item.displayName, item.departmentName, item.positionTitle]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("es-CR");

        return (
          matchesEmployment &&
          matchesStatus &&
          (!normalizedQuery || searchable.includes(normalizedQuery))
        );
      })
      .sort((first, second) => {
        const urgencyDifference =
          getItemUrgency(first, directory.today) -
          getItemUrgency(second, directory.today);
        return (
          urgencyDifference ||
          first.displayName.localeCompare(second.displayName, "es-CR")
        );
      });
  }, [directory, employment, query, status]);
  const hasEmployees = directory.items.length > 0;

  function selectMetric(nextStatus: DevelopmentDirectoryStatus) {
    setEmployment("active");
    setStatus((currentStatus) => (currentStatus === nextStatus ? "all" : nextStatus));
  }

  function clearFilters() {
    setEmployment("active");
    setQuery("");
    setStatus("all");
  }

  return (
    <section aria-labelledby="development-title" className={styles.page}>
      <header className={styles.heading}>
        <PageSectionHeader
          eyebrow="Administración"
          icon={Sprout}
          title="Desarrollo"
          titleId="development-title"
        />
      </header>

      {hasEmployees ? (
        <section aria-label="Filtrar por seguimiento 1:1" className={styles.metrics}>
          <button
            aria-pressed={status === "due"}
            className={styles.metric}
            data-selected={status === "due" ? "true" : undefined}
            data-tone="danger"
            onClick={() => selectMetric("due")}
            type="button"
          >
            <AlertCircle aria-hidden="true" />
            <span>Seguimiento vencido</span>
            <strong>{statusCounts.due}</strong>
          </button>
          <button
            aria-pressed={status === "never"}
            className={styles.metric}
            data-selected={status === "never" ? "true" : undefined}
            data-tone="warning"
            onClick={() => selectMetric("never")}
            type="button"
          >
            <MessageSquareText aria-hidden="true" />
            <span>Sin primer 1:1</span>
            <strong>{statusCounts.never}</strong>
          </button>
          <button
            aria-pressed={status === "current"}
            className={styles.metric}
            data-selected={status === "current" ? "true" : undefined}
            data-tone="success"
            onClick={() => selectMetric("current")}
            type="button"
          >
            <CheckCircle2 aria-hidden="true" />
            <span>Al día</span>
            <strong>{statusCounts.current}</strong>
          </button>
        </section>
      ) : null}

      <ElevatedSurface
        aria-labelledby="development-directory-title"
        as="section"
        className={styles.directory}
      >
        <div className={styles.directoryHeading}>
          <div>
            <p className="eyebrow">Seguimiento</p>
            <h2 id="development-directory-title">Colaboradores</h2>
            <p aria-live="polite" className={styles.directoryCount}>
              {filteredItems.length} de {directory.items.length} colaboradores
            </p>
          </div>

          {hasEmployees ? (
            <div
              aria-label="Filtros de colaboradores"
              className={styles.filters}
              role="group"
            >
              <label className={styles.filterField}>
                <span className={styles.filterLabel}>Buscar</span>
                <span className={styles.searchControl}>
                  <Search aria-hidden="true" size={18} />
                  <input
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Nombre, puesto o área"
                    type="search"
                    value={query}
                  />
                </span>
              </label>
              <label className={styles.filterField}>
                <span className={styles.filterLabel}>Seguimiento 1:1</span>
                <select
                  className={styles.select}
                  onChange={(event) =>
                    setStatus(event.target.value as DevelopmentDirectoryStatus | "all")
                  }
                  value={status}
                >
                  <option value="all">Todos</option>
                  <option value="due">Vencido</option>
                  <option value="never">Sin primer 1:1</option>
                  <option value="current">Al día</option>
                </select>
              </label>
              <label className={styles.filterField}>
                <span className={styles.filterLabel}>Estado laboral</span>
                <select
                  className={styles.select}
                  onChange={(event) =>
                    setEmployment(event.target.value as EmploymentFilter)
                  }
                  value={employment}
                >
                  <option value="active">Activos</option>
                  <option value="all">Todos</option>
                  <option value="inactive">Inactivos</option>
                </select>
              </label>
            </div>
          ) : null}
        </div>

        {filteredItems.length ? (
          <>
            <div className={styles.desktopTable}>
              <table>
                <caption className="sr-only">
                  Directorio de seguimiento de desarrollo
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Colaborador</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Último 1:1</th>
                    <th scope="col">Próximo 1:1</th>
                    <th scope="col">Acciones abiertas</th>
                    <th scope="col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.employeeId}>
                      <td>
                        <div className={styles.person}>
                          <span aria-hidden="true" className={styles.avatar}>
                            {getInitials(item.displayName)}
                          </span>
                          <span>
                            <strong>{item.displayName}</strong>
                            <small>
                              {item.positionTitle ?? "Sin puesto"} ·{" "}
                              {item.departmentName ?? "Sin departamento"}
                            </small>
                          </span>
                        </div>
                      </td>
                      <td>
                        <FollowUpStatus item={item} today={directory.today} />
                      </td>
                      <td>
                        {formatDate(item.lastFinalizedOneOnOneOn, "Sin registro")}
                      </td>
                      <td>{formatDate(item.nextOneOnOneDueOn, "Sin fecha")}</td>
                      <td>
                        {formatOpenActions(item)}
                        {item.overdueActionCount > 0 ? (
                          <small className={styles.alertText}>
                            {item.overdueActionCount}{" "}
                            {item.overdueActionCount === 1 ? "vencida" : "vencidas"}
                          </small>
                        ) : null}
                      </td>
                      <td>
                        <DevelopmentActions item={item} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul
              aria-label="Colaboradores para seguimiento"
              className={styles.mobileList}
            >
              {filteredItems.map((item) => (
                <li className={styles.mobileCard} key={item.employeeId}>
                  <div className={styles.mobileCardHeader}>
                    <span aria-hidden="true" className={styles.avatar}>
                      {getInitials(item.displayName)}
                    </span>
                    <div className={styles.mobileIdentity}>
                      <strong>{item.displayName}</strong>
                      <small>
                        {item.positionTitle ?? "Sin puesto"} ·{" "}
                        {item.departmentName ?? "Sin departamento"}
                      </small>
                    </div>
                    <div className={styles.mobileStatus}>
                      <FollowUpStatus item={item} today={directory.today} />
                    </div>
                  </div>

                  <dl className={styles.mobileFacts}>
                    <div>
                      <dt>Último 1:1</dt>
                      <dd>
                        {formatDate(item.lastFinalizedOneOnOneOn, "Sin registro")}
                      </dd>
                    </div>
                    <div>
                      <dt>Próximo 1:1</dt>
                      <dd>{formatDate(item.nextOneOnOneDueOn, "Sin fecha")}</dd>
                    </div>
                    <div>
                      <dt>Acciones abiertas</dt>
                      <dd>
                        {formatOpenActions(item)}
                        {item.overdueActionCount > 0 ? (
                          <small className={styles.alertText}>
                            {item.overdueActionCount}{" "}
                            {item.overdueActionCount === 1 ? "vencida" : "vencidas"}
                          </small>
                        ) : null}
                      </dd>
                    </div>
                  </dl>

                  <DevelopmentActions item={item} />
                </li>
              ))}
            </ul>
          </>
        ) : hasEmployees ? (
          <div className={styles.empty}>
            <Search aria-hidden="true" className={styles.emptyIcon} />
            <h3>No hay resultados</h3>
            <p className={styles.emptyDescription}>
              No encontramos colaboradores con estos filtros.
            </p>
            <Button onClick={clearFilters} variant="secondary">
              Limpiar filtros
            </Button>
          </div>
        ) : (
          <div className={styles.empty}>
            <UserPlus aria-hidden="true" className={styles.emptyIcon} />
            <h3>Todavía no hay colaboradores</h3>
            <p className={styles.emptyDescription}>
              Agregá al primer colaborador para iniciar su seguimiento de desarrollo.
            </p>
            <ButtonLink href="/admin/colaboradores/nuevo">
              Agregar colaborador
            </ButtonLink>
          </div>
        )}
      </ElevatedSurface>
    </section>
  );
}
