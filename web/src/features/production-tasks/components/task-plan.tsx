"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/button/button";
import { CheckboxField } from "@/components/ui/form-field/form-field";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import type { ProductionPlanEditorResult } from "../application/production-task-contracts";
import { taskRequest } from "../presentation/client";
import {
  formatTaskDate,
  planStatusLabel,
  taskErrorMessage,
} from "../presentation/messages";
import { TaskGrid } from "./task-grid";
import styles from "./tasks.module.css";

export function TaskPlan({ result }: { result: ProductionPlanEditorResult }) {
  const router = useRouter();
  const { plan } = result;
  const [confirmed, setConfirmed] = useState(false);
  const [warningsAccepted, setWarningsAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const warningTasks = plan.tasks.filter((task) => task.warnings.length);
  async function publish() {
    setBusy(true);
    setError("");
    try {
      await taskRequest("publish", {
        planId: plan.id,
        expectedVersion: plan.version,
        acknowledgeWarnings: warningsAccepted,
        confirmed,
      });
      router.push(`/tareas?fecha=${plan.weekStart}`);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No pudimos publicar la semana.",
      );
      setBusy(false);
    }
  }
  return (
    <>
      <ElevatedSurface className={styles.panel}>
        <div className={styles.toolbar}>
          <div>
            <h2>
              {formatTaskDate(plan.weekStart)} – {formatTaskDate(plan.weekEnd)}
            </h2>
            <p className={styles.muted}>
              {planStatusLabel[plan.status]} · Versión {plan.revision} ·{" "}
              {plan.tasks.length} tareas
            </p>
          </div>
          <ButtonLink variant="quiet" href="/tareas/historial">
            Ver historial
          </ButtonLink>
        </div>
        <TaskGrid tasks={plan.tasks} employees={result.employees} />
      </ElevatedSurface>
      {plan.status === "draft" && (
        <ElevatedSurface className={styles.panel}>
          <h2>Publicar para el equipo</h2>
          <p>
            La tabla es de solo lectura. Para corregir el contenido, importá un archivo
            nuevo para esta semana.
          </p>
          {warningTasks.length > 0 && (
            <>
              <div className={styles.notice}>
                <h3>Revisá la disponibilidad</h3>
                <details>
                  <summary>{warningTasks.length} tareas con advertencias</summary>
                  <ul>
                    {warningTasks.map((task) => (
                      <li key={task.id}>
                        {formatTaskDate(task.workDate)} · {task.description}:{" "}
                        {task.warnings.map(taskErrorMessage).join(" ")}
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
              <CheckboxField
                id="task-warnings"
                label="Revisé las advertencias de disponibilidad y quiero continuar."
                checked={warningsAccepted}
                disabled={busy}
                onChange={(event) => setWarningsAccepted(event.target.checked)}
              />
            </>
          )}
          <CheckboxField
            id="task-publish"
            label="Confirmo publicar esta semana para todos los colaboradores. Si ya existe una versión publicada, será reemplazada y conservada en el historial."
            checked={confirmed}
            disabled={busy}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <div className={styles.actions}>
            <Button
              disabled={
                busy || !confirmed || (!!warningTasks.length && !warningsAccepted)
              }
              onClick={publish}
            >
              {busy ? "Publicando…" : "Confirmar y publicar semana"}
            </Button>
            <ButtonLink href="/tareas/importar" variant="quiet">
              Importar corrección
            </ButtonLink>
          </div>
        </ElevatedSurface>
      )}
    </>
  );
}
