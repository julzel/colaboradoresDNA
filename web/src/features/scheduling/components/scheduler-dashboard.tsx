"use client";

// import { CalendarDays, UserRoundSearch } from "lucide-react";
import { UserRoundSearch } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

// import { Button } from "@/components/ui/button/button";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { ListToolbar } from "@/components/ui/list-toolbar/list-toolbar";
import { MetricCard } from "@/components/ui/metric-card/metric-card";
import { SearchField } from "@/components/ui/search-field/search-field";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { Tooltip } from "@/components/ui/tooltip/tooltip";
import type {
  SchedulerDashboardView,
  SchedulerRosterItemView,
  SchedulerRosterStatus,
} from "@/features/scheduling/view-models/scheduler-view";

import styles from "./scheduler-dashboard.module.css";

type RosterFilter = "all" | SchedulerRosterStatus;

const filters: ReadonlyArray<{ label: string; value: RosterFilter }> = [
  { label: "Todos", value: "all" },
  { label: "Configurados", value: "configured" },
  { label: "Alternantes", value: "alternating" },
  { label: "Sin horario", value: "missing" },
];

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

function matchesFilter(item: SchedulerRosterItemView, filter: RosterFilter) {
  if (filter === "all") return true;
  if (filter === "configured") return item.status !== "missing";
  return item.status === filter;
}

export function SchedulePreview({
  item,
  showMeta = true,
}: {
  item: SchedulerRosterItemView;
  showMeta?: boolean;
}) {
  if (item.status === "missing") {
    return (
      <div className={styles.missingSchedule}>
        <strong className={styles.missingTitle}>Sin horario configurado</strong>
        <span className={styles.missingText}>
          Este colaborador todavía no tiene una jornada vigente para esta fecha.
        </span>
      </div>
    );
  }

  return (
    <div className={styles.schedulePreview}>
      {showMeta && (
        <div className={styles.scheduleMeta}>
          <span>{item.scheduleSummary}</span>
          <span>{item.effectiveLabel}</span>
        </div>
      )}
      {item.weeks.map((week) => (
        <div className={styles.week} key={week.label}>
          <span className={styles.weekLabel}>{week.label}</span>
          <div className={styles.dayList}>
            {week.days.map((day) => (
              <span
                className={styles.day}
                data-working={day.isWorkingDay}
                key={day.dayLabel}
              >
                <strong className={styles.dayName}>{day.dayLabel}</strong>
                <span className={styles.dayHours}>{day.hoursLabel ?? "Libre"}</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ScheduleStatus({ item }: { item: SchedulerRosterItemView }) {
  if (item.status === "missing") {
    return <StatusBadge tone="warning">Sin horario</StatusBadge>;
  }

  const label =
    item.status === "alternating" ? "Horario alternante" : "Horario configurado";

  return (
    <Tooltip
      content={
        <span className={styles.scheduleTooltip}>
          <strong>{item.scheduleSummary}</strong>
          <span>{item.effectiveLabel}</span>
        </span>
      }
      label={`Información de ${label.toLocaleLowerCase("es")}`}
    >
      <StatusBadge tone="success">{label}</StatusBadge>
    </Tooltip>
  );
}

export function SchedulerDashboard({
  counts,
  items,
  selectedDate,
}: SchedulerDashboardView) {
  const [filter, setFilter] = useState<RosterFilter>("all");
  const [search, setSearch] = useState("");

  const visibleItems = useMemo(() => {
    const query = normalizeSearchText(search.trim());

    return items.filter(
      (item) =>
        matchesFilter(item, filter) &&
        (!query || normalizeSearchText(item.displayName).includes(query)),
    );
  }, [filter, items, search]);

  const filterCounts: Record<RosterFilter, number> = {
    all: counts.total,
    alternating: counts.alternating,
    configured: counts.configured,
    missing: counts.missing,
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.metrics} aria-label="Resumen de horarios">
        <MetricCard label="Total del equipo" value={counts.total} />
        <MetricCard label="Con horario" value={counts.configured} />
        <MetricCard label="Alternantes" value={counts.alternating} />
        <MetricCard
          label="Sin horario"
          tone={counts.missing > 0 ? "warning" : "brand"}
          value={counts.missing}
        />
      </div>

      <ElevatedSurface as="section" className={styles.roster}>
        <div className={styles.rosterHeader}>
          <div>
            <h2>Horarios del equipo</h2>
          </div>
          {/* <form className={styles.dateForm} method="get">
            <TextField
              className={styles.dateInput}
              defaultValue={selectedDate}
              id="scheduler-date"
              label="Fecha de consulta"
              name="fecha"
              type="date"
            />
            <Button size="small" type="submit" variant="secondary">
              <CalendarDays aria-hidden="true" size={16} />
              Consultar
            </Button>
          </form> */}
        </div>

        <ListToolbar className={styles.toolbar}>
          <SearchField
            autoComplete="off"
            className={styles.searchBar}
            id="scheduler-search"
            label="Buscar colaboradores"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre…"
            value={search}
          />
          <div aria-label="Filtrar horarios" className={styles.filters} role="group">
            {filters.map((item) => (
              <button
                aria-pressed={filter === item.value}
                className={styles.filter}
                key={item.value}
                onClick={() => setFilter(item.value)}
                type="button"
              >
                {item.label}
                <span className={styles.filterCount}>{filterCounts[item.value]}</span>
              </button>
            ))}
          </div>
        </ListToolbar>

        <p aria-live="polite" className={styles.resultCount}>
          {visibleItems.length}{" "}
          {visibleItems.length === 1 ? "colaborador" : "colaboradores"}
        </p>

        {visibleItems.length === 0 ? (
          <div className={styles.empty}>
            <UserRoundSearch aria-hidden="true" size={28} strokeWidth={1.7} />
            <div>
              <h3>No encontramos colaboradores</h3>
              <p>Probá con otro nombre o cambiá el filtro seleccionado.</p>
            </div>
          </div>
        ) : (
          <ul className={styles.rosterList}>
            {visibleItems.map((item) => (
              <li className={styles.rosterItem} key={item.id}>
                <div className={styles.person}>
                  <span className={styles.avatar} aria-hidden="true">
                    {item.displayName
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")
                      .toLocaleUpperCase("es")}
                  </span>
                  <div>
                    <Link href={`/admin/colaboradores/${item.id}`}>
                      {item.displayName}
                    </Link>
                    <ScheduleStatus item={item} />
                  </div>
                </div>
                <SchedulePreview item={item} showMeta={false} />
                <Link
                  className={styles.profileLink}
                  href={`/admin/horarios/${item.id}?fecha=${selectedDate}`}
                >
                  Administrar
                </Link>
              </li>
            ))}
          </ul>
        )}
      </ElevatedSurface>
    </div>
  );
}
