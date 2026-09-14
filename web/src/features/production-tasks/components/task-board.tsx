"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  History,
  SlidersHorizontal,
} from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button/button";
import { SelectField, TextField } from "@/components/ui/form-field/form-field";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { FilterBar, FilterChip } from "@/components/ui/filter-bar/filter-bar";
import { ListToolbar } from "@/components/ui/list-toolbar/list-toolbar";
import type { ProductionBoardResult } from "../application/production-task-contracts";
import { addCalendarDays } from "../domain/shared";
import { formatTaskDate } from "../presentation/messages";
import { TaskCalendar, formatCalendarDay } from "./task-calendar";
import { TaskEditor } from "./task-editor";
import styles from "./tasks.module.css";

export function TaskBoard({
  board,
  initialMine = false,
  initialArea = "",
  initialView = "day",
}: {
  board: ProductionBoardResult;
  initialMine?: boolean;
  initialArea?: string;
  initialView?: "day" | "week";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editing, setEditing] = useState<ProductionBoardResult["tasks"][number] | null>(
    null,
  );
  const mine = initialMine;
  const area = initialArea;
  const view = initialView;
  const selectedDate = board.query.selectedDate;
  const days = Array.from({ length: 7 }, (_, i) =>
    addCalendarDays(board.query.weekStart, i),
  );
  const ownTasks = board.tasks.filter(
    (task) =>
      !!board.currentEmployeeId &&
      task.assigneeEmployeeIds.includes(board.currentEmployeeId),
  );
  const inPeriod = (task: ProductionBoardResult["tasks"][number]) =>
    (view === "week" || task.workDate === selectedDate) &&
    (!area || task.areaId === area);
  const weekTasks = (mine ? ownTasks : board.tasks).filter(
    (task) => !area || task.areaId === area,
  );
  const tasks = weekTasks.filter(inPeriod);
  const href = (date = selectedDate, mode = view, onlyMine = mine, areaId = area) => {
    const params = new URLSearchParams({
      fecha: date,
      periodo: mode === "day" ? "dia" : "semana",
    });
    if (onlyMine) params.set("vista", "mias");
    if (areaId) params.set("area", areaId);
    return `/tareas?${params}`;
  };
  const step = view === "day" ? 1 : 7;
  return (
    <>
      <ElevatedSurface
        as="section"
        className={styles.workPlan}
        aria-labelledby="work-plan-title"
        aria-busy={pending}
      >
        <div className={`${styles.workPlanHeader} ${styles.planHeading}`}>
          <div>
            <h2 id="work-plan-title">Plan de trabajo</h2>
            <p>
              {view === "day"
                ? formatCalendarDay(selectedDate)
                : `${formatTaskDate(board.query.weekStart)} – ${formatTaskDate(board.query.weekEnd)}`}
            </p>
          </div>
          <div className={styles.calendarControls}>
            <nav
              className={styles.viewSwitch}
              aria-label="Vista del calendario"
              data-view={view}
            >
              <ButtonLink
                href={href(selectedDate, "day")}
                aria-current={view === "day" ? "page" : undefined}
                size="small"
                variant="quiet"
              >
                Día
              </ButtonLink>
              <ButtonLink
                href={href(selectedDate, "week")}
                aria-current={view === "week" ? "page" : undefined}
                size="small"
                variant="quiet"
              >
                Semana
              </ButtonLink>
            </nav>
            <nav
              className={styles.planNavigation}
              aria-label={view === "day" ? "Navegar días" : "Navegar semanas"}
            >
              <ButtonLink
                href={href(addCalendarDays(selectedDate, -step))}
                variant="quiet"
                aria-label={view === "day" ? "Día anterior" : "Semana anterior"}
              >
                <ChevronLeft aria-hidden="true" size={20} />
              </ButtonLink>
              <ButtonLink href={href(board.today)} variant="quiet">
                Hoy
              </ButtonLink>
              <ButtonLink
                href={href(addCalendarDays(selectedDate, step))}
                variant="quiet"
                aria-label={view === "day" ? "Día siguiente" : "Semana siguiente"}
              >
                <ChevronRight aria-hidden="true" size={20} />
              </ButtonLink>
            </nav>
            {board.canManage && (
              <ButtonLink
                href="/tareas/historial"
                variant="quiet"
                aria-label="Historial"
                title="Historial"
              >
                <History aria-hidden="true" size={18} />
              </ButtonLink>
            )}
          </div>
        </div>
        <ListToolbar className={styles.planToolbar}>
          <FilterBar as="nav" aria-label="Filtrar tareas">
            <FilterChip
              active={!mine}
              count={board.tasks.filter(inPeriod).length}
              href={href(selectedDate, view, false)}
            >
              Equipo completo
            </FilterChip>
            <FilterChip
              active={mine}
              count={ownTasks.filter(inPeriod).length}
              href={href(selectedDate, view, true)}
            >
              Mis tareas
            </FilterChip>
          </FilterBar>
          <Button
            variant="quiet"
            className={styles.filterToggle}
            aria-expanded={filtersOpen}
            aria-controls="task-date-area-filters"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
            Fecha y área{area ? " · 1 filtro" : ""}
          </Button>
          <div
            id="task-date-area-filters"
            className={`${styles.planFilters} ${styles.expandableFilters}`}
            data-expanded={filtersOpen}
          >
            <form className={styles.datePicker} action="/tareas">
              <TextField
                key={selectedDate}
                id="tasks-date"
                label="Ir a una fecha"
                type="date"
                name="fecha"
                defaultValue={selectedDate}
                required
              />
              <input
                type="hidden"
                name="periodo"
                value={view === "day" ? "dia" : "semana"}
              />
              {mine && <input type="hidden" name="vista" value="mias" />}
              {area && <input type="hidden" name="area" value={area} />}
              <Button variant="secondary" type="submit">
                Ir
              </Button>
            </form>
            <SelectField
              id="tasks-area"
              label="Área de trabajo"
              value={area}
              disabled={pending}
              onChange={(event) => {
                const nextHref = href(selectedDate, view, mine, event.target.value);
                startTransition(() => router.push(nextHref, { scroll: false }));
              }}
            >
              <option value="">Todas las áreas</option>
              {Array.from(
                new Map([
                  ...board.areas.map((item) => [item.id, item.name] as const),
                  ...board.tasks.map((task) => [task.areaId, task.areaName] as const),
                ]),
              ).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </SelectField>
          </div>
        </ListToolbar>
        {view === "day" && (
          <nav className={styles.dayStrip} aria-label="Días de la semana">
            {days.map((day) => {
              const count = weekTasks.filter((task) => task.workDate === day).length;
              return (
                <Link
                  key={day}
                  href={href(day, "day")}
                  aria-current={day === selectedDate ? "date" : undefined}
                  data-today={day === board.today}
                  aria-label={`${formatCalendarDay(day)}${day === board.today ? ", hoy" : ""}, ${count} ${count === 1 ? "tarea" : "tareas"}`}
                >
                  <span>{formatCalendarDay(day, "short")}</span>
                  <strong>{Number(day.slice(-2))}</strong>
                  <span className={styles.dayCount}>{count}</span>
                </Link>
              );
            })}
          </nav>
        )}
        <div className={styles.workPlanContent}>
          <p className={styles.resultCount} role="status">
            {pending
              ? "Actualizando tareas…"
              : `${tasks.length} ${tasks.length === 1 ? "tarea" : "tareas"} ${view === "day" ? "en este día" : "en esta semana"}${mine ? " · Mis tareas" : ""}`}
          </p>
          {!board.plan ? (
            <div className={styles.calendarEmpty}>
              <CalendarDays size={28} aria-hidden="true" />
              <h3>El plan de esta semana aún no está publicado</h3>
              <p>Elegí otra fecha para consultar las tareas disponibles.</p>
            </div>
          ) : (
            <TaskCalendar
              days={view === "day" ? [selectedDate] : days}
              view={view}
              tasks={tasks}
              employees={board.employees}
              currentEmployeeId={board.currentEmployeeId}
              today={board.today}
              dayHref={(day) => href(day, "day")}
              filtered={mine || !!area}
              {...(board.canManage
                ? {
                    onEdit: (id: string) =>
                      setEditing(board.tasks.find((task) => task.id === id) ?? null),
                  }
                : {})}
            />
          )}
          {(mine || area) && (
            <ButtonLink href={href(selectedDate, view, false, "")} variant="quiet">
              Limpiar filtros
            </ButtonLink>
          )}
        </div>
      </ElevatedSurface>
      {editing && (
        <TaskEditor
          task={editing}
          today={board.today}
          initialDate={editing.workDate}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
