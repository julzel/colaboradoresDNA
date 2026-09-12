"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, History } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button/button";
import { SelectField, TextField } from "@/components/ui/form-field/form-field";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { FilterBar, FilterChip } from "@/components/ui/filter-bar/filter-bar";
import { ListToolbar } from "@/components/ui/list-toolbar/list-toolbar";
import type { ProductionBoardResult } from "../application/production-task-contracts";
import { addCalendarDays } from "../domain/shared";
import { formatTaskDate } from "../presentation/messages";
import { TaskGrid } from "./task-grid";
import { TaskEditor } from "./task-editor";
import styles from "./tasks.module.css";

export function TaskBoard({
  board,
  initialMine = false,
}: {
  board: ProductionBoardResult;
  initialMine?: boolean;
}) {
  const [mine, setMine] = useState(initialMine);
  const [area, setArea] = useState("");
  const [editing, setEditing] = useState<ProductionBoardResult["tasks"][number] | null>(
    null,
  );
  const ownTasks = board.tasks.filter(
    (task) =>
      board.currentEmployeeId &&
      task.assigneeEmployeeIds.includes(board.currentEmployeeId),
  );
  const tasks = (mine ? ownTasks : board.tasks).filter(
    (task) => !area || task.areaId === area,
  );
  return (
    <>
      <ElevatedSurface
        as="section"
        className={styles.workPlan}
        aria-labelledby="work-plan-title"
      >
        <div className={`${styles.workPlanHeader} ${styles.planHeading}`}>
          <div>
            <h2 id="work-plan-title">Plan de trabajo</h2>
            <p>
              {formatTaskDate(board.query.weekStart)} –{" "}
              {formatTaskDate(board.query.weekEnd)}
            </p>
            <p>
              {board.plan
                ? `Versión ${board.plan.revision} · ${board.canManage ? "Edición de tareas desde hoy" : "Solo lectura"}`
                : "Semana sin publicar"}
            </p>
          </div>
          <nav className={styles.planNavigation} aria-label="Navegar semanas">
            <ButtonLink
              href={`/tareas?fecha=${addCalendarDays(board.query.weekStart, -7)}${mine ? "&vista=mias" : ""}`}
              variant="quiet"
              aria-label="Semana anterior"
            >
              <ChevronLeft aria-hidden="true" size={20} />
            </ButtonLink>
            <ButtonLink
              href={`/tareas?fecha=${board.today}${mine ? "&vista=mias" : ""}`}
              variant="quiet"
            >
              Hoy
            </ButtonLink>
            <ButtonLink
              href={`/tareas?fecha=${addCalendarDays(board.query.weekStart, 7)}${mine ? "&vista=mias" : ""}`}
              variant="quiet"
              aria-label="Semana siguiente"
            >
              <ChevronRight aria-hidden="true" size={20} />
            </ButtonLink>
            {board.canManage && (
              <ButtonLink
                href="/tareas/historial"
                variant="quiet"
                aria-label="Historial"
                title="Historial"
              >
                <History aria-hidden="true" size={18} />
                <span className={styles.historyLabel}>Historial</span>
              </ButtonLink>
            )}
          </nav>
        </div>
        <ListToolbar className={styles.planToolbar}>
          <FilterBar aria-label="Filtrar tareas">
            <FilterChip
              active={!mine}
              count={board.tasks.length}
              onClick={() => setMine(false)}
            >
              Equipo completo
            </FilterChip>
            <FilterChip
              active={mine}
              count={ownTasks.length}
              onClick={() => setMine(true)}
            >
              Mis tareas
            </FilterChip>
          </FilterBar>
          <div className={styles.planFilters}>
            <form className={styles.datePicker} action="/tareas">
              {mine && <input type="hidden" name="vista" value="mias" />}
              <TextField
                id="tasks-date"
                label="Buscar semana"
                type="date"
                name="fecha"
                defaultValue={board.query.selectedDate}
                required
              />
              <Button variant="secondary" type="submit">
                Ver
              </Button>
            </form>
            <SelectField
              id="tasks-area"
              label="Área de trabajo"
              value={area}
              onChange={(event) => setArea(event.target.value)}
            >
              <option value="">Todas las áreas</option>
              {[
                ...new Map(
                  board.tasks.map((task) => [task.areaId, task.areaName]),
                ).entries(),
              ].map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </SelectField>
          </div>
        </ListToolbar>
        <div className={styles.workPlanContent}>
          <p className={styles.resultCount} aria-live="polite">
            {tasks.length} {tasks.length === 1 ? "tarea" : "tareas"}
          </p>
          {!board.plan ? (
            <p className={styles.empty}>
              Todavía no se ha publicado el plan de esta semana.
            </p>
          ) : (
            <TaskGrid
              tasks={tasks}
              employees={board.employees}
              currentEmployeeId={board.currentEmployeeId}
              today={board.today}
              {...(board.canManage
                ? {
                    onEdit: (id: string) =>
                      setEditing(board.tasks.find((task) => task.id === id) ?? null),
                  }
                : {})}
            />
          )}
        </div>
      </ElevatedSurface>
      <ElevatedSurface className={styles.panel}>
        <div className={styles.toolbar}>
          <h2>
            Mis tareas de la semana{" "}
            <span className={styles.count}>{ownTasks.length}</span>
          </h2>
          <Link className={styles.textLink} href={`/tareas?fecha=${board.today}`}>
            Semana actual
          </Link>
        </div>
        {ownTasks.length ? (
          <ul className={styles.personalList}>
            {ownTasks.slice(0, 4).map((task) => (
              <li key={task.id}>
                <span className={styles.muted}>
                  {formatTaskDate(task.workDate)} · {task.areaName}
                </span>
                <strong>{task.description}</strong>
                {task.subject && <span>{task.subject}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>No tenés tareas asignadas para esta semana.</p>
        )}
        {ownTasks.length > 4 && (
          <Button variant="quiet" onClick={() => setMine(true)}>
            Ver mis {ownTasks.length} tareas en la tabla
          </Button>
        )}
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
