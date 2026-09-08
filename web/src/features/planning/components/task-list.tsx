"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button/button";
import {
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/ui/form-field/form-field";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { isReady, type PlanningTask, type Proposal } from "../domain/contracts";
import styles from "./planning.module.css";

export const statusLabels: Record<PlanningTask["status"], string> = {
  ready: "Lista para iniciar",
  in_progress: "En progreso",
  blocked: "Bloqueada",
  needs_clarification: "Por aclarar",
  done: "Completada",
  cancelled: "Cancelada",
};
const priorityLabels = { high: "Alta", medium: "Media", low: "Baja" };

function ProgressEditor({
  task,
  busy,
  onSave,
}: {
  task: PlanningTask;
  busy: boolean;
  onSave: (task: PlanningTask) => Promise<void>;
}) {
  const [progress, setProgress] = useState(task);
  return (
    <form
      className={styles.fields}
      onSubmit={(event) => {
        event.preventDefault();
        void onSave(progress);
      }}
    >
      <SelectField
        id={`status-${task.id}`}
        label="Estado de la tarea"
        disabled={busy}
        value={progress.status}
        onChange={(event) =>
          setProgress({
            ...progress,
            status: event.target.value as PlanningTask["status"],
          })
        }
      >
        {Object.entries(statusLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </SelectField>
      {(progress.status === "blocked" || progress.status === "needs_clarification") && (
        <TextField
          id={`blocker-${task.id}`}
          label="Qué hace falta para continuar"
          maxLength={1000}
          required={progress.status === "blocked"}
          value={progress.blocker}
          onChange={(event) =>
            setProgress({ ...progress, blocker: event.target.value })
          }
        />
      )}
      <TextAreaField
        id={`note-${task.id}`}
        label="Nota de avance o resultado"
        rows={2}
        maxLength={1000}
        value={progress.completionNote}
        onChange={(event) =>
          setProgress({ ...progress, completionNote: event.target.value })
        }
      />
      <Button variant="secondary" type="submit" disabled={busy}>
        Guardar avance
      </Button>
    </form>
  );
}

export function TaskList({
  plan,
  editable = false,
  busy,
  onChange,
  onProgress,
}: {
  plan: Proposal;
  editable?: boolean;
  busy: boolean;
  onChange?: (tasks: PlanningTask[]) => void;
  onProgress?: (task: PlanningTask) => Promise<void>;
}) {
  function change(id: string, fields: Partial<PlanningTask>) {
    onChange?.(
      plan.tasks.map((task) => (task.id === id ? { ...task, ...fields } : task)),
    );
  }
  function move(index: number, offset: number) {
    const tasks = [...plan.tasks];
    const target = index + offset;
    if (!tasks[index] || !tasks[target]) return;
    [tasks[index], tasks[target]] = [tasks[target]!, tasks[index]!];
    onChange?.(tasks);
  }
  return (
    <ol className={styles.taskList}>
      {plan.tasks.map((task, index) => (
        <li key={task.id} className={styles.task}>
          <div className={styles.taskHeading}>
            <span className={styles.rank} aria-label={`Posición ${index + 1}`}>
              {index + 1}
            </span>
            <div className={styles.taskCopy}>
              <h3>{task.title}</h3>
              <div className={styles.badges}>
                <StatusBadge tone={task.priority === "high" ? "warning" : "neutral"}>
                  Prioridad {priorityLabels[task.priority].toLowerCase()}
                </StatusBadge>
                <StatusBadge
                  tone={
                    task.status === "done"
                      ? "success"
                      : task.status === "blocked"
                        ? "danger"
                        : "neutral"
                  }
                >
                  {statusLabels[task.status]}
                </StatusBadge>
              </div>
            </div>
            {editable && (
              <div className={styles.orderActions}>
                <Button
                  variant="quiet"
                  aria-label={`Subir ${task.title}`}
                  disabled={busy || index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp size={18} />
                </Button>
                <Button
                  variant="quiet"
                  aria-label={`Bajar ${task.title}`}
                  disabled={busy || index === plan.tasks.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown size={18} />
                </Button>
              </div>
            )}
          </div>
          <p className={styles.nextAction}>{task.nextAction}</p>
          <p className={styles.muted}>{task.rationale}</p>
          {task.dependencies.length > 0 && (
            <p className={styles.muted}>
              <strong>Depende de:</strong>{" "}
              {task.dependencies
                .map((id) => plan.tasks.find((other) => other.id === id)?.title)
                .join(" · ")}
              {!isReady(task, plan.tasks) && task.status === "ready"
                ? " · Todavía no puede iniciarse"
                : ""}
            </p>
          )}
          {task.blocker && (
            <p className={styles.muted}>
              <strong>Bloqueo:</strong> {task.blocker}
            </p>
          )}
          <details className={styles.taskDetails}>
            <summary>{editable ? "Evidencia y edición" : "Detalles y avance"}</summary>
            <div className={styles.fields}>
              <p>
                <strong>Resultado esperado:</strong> {task.outcome}
              </p>
              <p>
                <strong>Tiempo:</strong>{" "}
                {task.effortMinutes ? `${task.effortMinutes} min` : "Por estimar"} ·{" "}
                <strong>Fecha límite:</strong> {task.dueDate ?? "No indicada"}
              </p>
              {task.inputReference && (
                <p className={styles.muted}>
                  <strong>Entrada original:</strong> {task.inputReference}
                </p>
              )}
              {task.assumptions.length > 0 && (
                <div>
                  <strong>Supuestos por confirmar</strong>
                  <ul>
                    {task.assumptions.map((assumption, i) => (
                      <li key={i}>{assumption}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <strong>Referencias utilizadas</strong>
                {task.sourceIds.length ? (
                  <ul>
                    {task.sourceIds.map((id) => {
                      const source = plan.sources.find((record) => record.id === id);
                      return (
                        <li key={id}>
                          <strong>{source?.title}</strong> · revisión{" "}
                          {source?.reviewedOn}
                          <p className={styles.muted}>{source?.content}</p>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className={styles.muted}>
                    Sin referencia de empresa; revisá el criterio y los supuestos.
                  </p>
                )}
              </div>
              {editable ? (
                <>
                  <TextField
                    id={`edit-title-${task.id}`}
                    label="Título de la tarea"
                    value={task.title}
                    maxLength={200}
                    disabled={busy}
                    onChange={(event) => change(task.id, { title: event.target.value })}
                  />
                  <TextAreaField
                    id={`edit-action-${task.id}`}
                    label="Próxima acción"
                    value={task.nextAction}
                    maxLength={1000}
                    disabled={busy}
                    onChange={(event) =>
                      change(task.id, { nextAction: event.target.value })
                    }
                  />
                  <TextAreaField
                    id={`edit-outcome-${task.id}`}
                    label="Resultado esperado"
                    value={task.outcome}
                    maxLength={1000}
                    disabled={busy}
                    onChange={(event) =>
                      change(task.id, { outcome: event.target.value })
                    }
                  />
                </>
              ) : (
                onProgress && (
                  <ProgressEditor task={task} busy={busy} onSave={onProgress} />
                )
              )}
            </div>
          </details>
        </li>
      ))}
    </ol>
  );
}
