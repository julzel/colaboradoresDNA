"use client";

import { CalendarDays, Search, UserRoundSearch } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button/button";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { TextField } from "@/components/ui/form-field/form-field";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
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

export function SchedulePreview({ item }: { item: SchedulerRosterItemView }) {
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
      <div className={styles.scheduleMeta}>
        <span>{item.scheduleSummary}</span>
        <span>{item.effectiveLabel}</span>
      </div>
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
        <ElevatedSurface className={styles.metric}>
          <span className={styles.metricLabel}>Total del equipo</span>
          <strong className={styles.metricValue}>{counts.total}</strong>
        </ElevatedSurface>
        <ElevatedSurface className={styles.metric}>
          <span className={styles.metricLabel}>Con horario</span>
          <strong className={styles.metricValue}>{counts.configured}</strong>
        </ElevatedSurface>
        <ElevatedSurface className={styles.metric}>
          <span className={styles.metricLabel}>Alternantes</span>
          <strong className={styles.metricValue}>{counts.alternating}</strong>
        </ElevatedSurface>
        <ElevatedSurface className={styles.metric} data-warning={counts.missing > 0}>
          <span className={styles.metricLabel}>Sin horario</span>
          <strong className={styles.metricValue}>{counts.missing}</strong>
        </ElevatedSurface>
      </div>

      <ElevatedSurface as="section" className={styles.roster}>
        <div className={styles.rosterHeader}>
          <div>
            <h2>Horarios del equipo</h2>
            <p>Consultá la jornada vigente de cada colaborador.</p>
          </div>
          <form className={styles.dateForm} method="get">
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
          </form>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.searchBar} role="search">
            <Search aria-hidden="true" className={styles.searchIcon} size={19} />
            <TextField
              autoComplete="off"
              className={styles.searchInput}
              id="scheduler-search"
              label="Buscar colaboradores"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre…"
              type="search"
              value={search}
              visuallyHiddenLabel
            />
          </div>
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
        </div>

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
                    <StatusBadge
                      tone={item.status === "missing" ? "warning" : "success"}
                    >
                      {item.status === "missing"
                        ? "Sin horario"
                        : item.status === "alternating"
                          ? "Horario alternante"
                          : "Horario configurado"}
                    </StatusBadge>
                  </div>
                </div>
                <SchedulePreview item={item} />
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
