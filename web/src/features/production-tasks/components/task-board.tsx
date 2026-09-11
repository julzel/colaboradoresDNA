"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, History, Upload } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button/button";
import { SelectField, TextField } from "@/components/ui/form-field/form-field";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import type { ProductionBoardResult } from "../application/production-task-contracts";
import { addCalendarDays } from "../domain/shared";
import { formatTaskDate } from "../presentation/messages";
import { TaskGrid } from "./task-grid";
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
      <ElevatedSurface className={styles.panel}>
        <div className={styles.toolbar}>
          <div className={styles.weekNav}>
            <ButtonLink
              href={`/tareas?fecha=${addCalendarDays(board.query.weekStart, -7)}`}
              variant="quiet"
              aria-label="Semana anterior"
            >
              <ChevronLeft size={20} />
            </ButtonLink>
            <div>
              <h2>
                {formatTaskDate(board.query.weekStart)} –{" "}
                {formatTaskDate(board.query.weekEnd)}
              </h2>
              <p className={styles.muted}>
                {board.plan
                  ? `Versión ${board.plan.revision} · Solo lectura`
                  : "Semana sin publicar"}
              </p>
            </div>
            <ButtonLink
              href={`/tareas?fecha=${addCalendarDays(board.query.weekStart, 7)}`}
              variant="quiet"
              aria-label="Semana siguiente"
            >
              <ChevronRight size={20} />
            </ButtonLink>
          </div>
          {board.canManage && (
            <div className={styles.actions}>
              <ButtonLink href="/tareas/historial" variant="quiet">
                <History size={18} />
                Historial
              </ButtonLink>
              <ButtonLink href="/tareas/importar">
                <Upload size={18} />
                Importar tareas
              </ButtonLink>
            </div>
          )}
        </div>
        <div className={styles.controls}>
          <form className={styles.datePicker} action="/tareas">
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
      <ElevatedSurface className={styles.panel}>
        <div className={styles.toolbar}>
          <h2>Plan de trabajo</h2>
          <div className={styles.tabs} aria-label="Filtrar tareas">
            <Button
              variant={!mine ? "primary" : "quiet"}
              aria-pressed={!mine}
              onClick={() => setMine(false)}
            >
              Equipo completo
            </Button>
            <Button
              variant={mine ? "primary" : "quiet"}
              aria-pressed={mine}
              onClick={() => setMine(true)}
            >
              Mis tareas
            </Button>
          </div>
        </div>
        {!board.plan ? (
          <p className={styles.empty}>
            Todavía no se ha publicado el plan de esta semana.
          </p>
        ) : (
          <TaskGrid
            tasks={tasks}
            employees={board.employees}
            currentEmployeeId={board.currentEmployeeId}
          />
        )}
      </ElevatedSurface>
    </>
  );
}
