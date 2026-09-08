"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ListOrdered, Sparkles, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button/button";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { TextAreaField, TextField } from "@/components/ui/form-field/form-field";
import { MetricCard } from "@/components/ui/metric-card/metric-card";
import { PageSectionHeader } from "@/components/ui/page-section-header/page-section-header";
import { planningApi } from "../client/planning-api";
import {
  isReady,
  type Bootstrap,
  type Proposal,
  type Workspace,
} from "../domain/contracts";
import { ContextEditor } from "./context-editor";
import { TaskList } from "./task-list";
import styles from "./planning.module.css";

export function PlanningWorkspace() {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [input, setInput] = useState("");
  const [personalContext, setPersonalContext] = useState("");
  const [horizon, setHorizon] = useState("Esta semana");
  const [feedback, setFeedback] = useState("");
  const [draft, setDraft] = useState<Proposal | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const resultRef = useRef<HTMLHeadingElement>(null);

  const load = useCallback(async (signal?: AbortSignal, hydrate = false) => {
    const result = await planningApi.load(signal);
    setData(result);
    setDraft(result.workspace.proposal);
    if (hydrate) {
      setInput(result.workspace.input);
      setPersonalContext(result.workspace.personalContext);
      setHorizon(result.workspace.horizon);
    }
    return result;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void planningApi
      .load(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result);
        setDraft(result.workspace.proposal);
        setInput(result.workspace.input);
        setPersonalContext(result.workspace.personalContext);
        setHorizon(result.workspace.horizon);
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error ? failure.message : "No pudimos cargar tu plan.",
          );
      });
    return () => controller.abort();
  }, []);

  async function run(label: string, operation: () => Promise<void>) {
    if (busy) return;
    setBusy(label);
    setError("");
    setNotice("");
    try {
      await operation();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "No pudimos completar la acción.",
      );
      // Refresh versions after failed generations/reservations, but retain typed input and edits.
      try {
        const fresh = await planningApi.load();
        setData(fresh);
      } catch {
        /* Keep the last readable state. */
      }
    } finally {
      setBusy("");
    }
  }

  function applyWorkspace(workspace: Workspace) {
    setData((current) => (current ? { ...current, workspace } : current));
    setDraft(workspace.proposal);
  }

  async function generate() {
    if (!data) return;
    await run("Preparando tu propuesta…", async () => {
      const workspace = await planningApi.generate({
        version: data.workspace.version,
        input,
        personalContext,
        horizon,
        feedback,
      });
      applyWorkspace(workspace);
      setFeedback("");
      setNotice("Propuesta lista. Revisá el orden y aceptá cuando estés de acuerdo.");
      requestAnimationFrame(() => resultRef.current?.focus());
    });
  }

  const accepted = data?.workspace.acceptedPlan;
  const tasks = accepted?.tasks ?? [];
  const next = tasks.find((task) => isReady(task, tasks));
  const generating = Boolean(
    data?.workspace.generatingUntil &&
      data.workspace.generatingUntil > new Date().toISOString(),
  );
  const disabled = Boolean(busy) || generating;

  return (
    <section className={styles.page} aria-labelledby="planning-title">
      <PageSectionHeader
        icon={ListOrdered}
        title="Mis prioridades"
        titleId="planning-title"
      />
      <div role="status" aria-live="polite" className={styles.feedback}>
        {busy ||
          notice ||
          (generating ? "Hay una propuesta en proceso. Recargá en unos momentos." : "")}
      </div>
      {error && (
        <div role="alert" className={styles.error}>
          {error}
        </div>
      )}
      {!data ? (
        <ElevatedSurface className={styles.panel}>
          <p>
            {error
              ? "No se pudo cargar el planificador."
              : "Cargando tu espacio de planificación…"}
          </p>
          {error && (
            <Button
              onClick={() =>
                void run("Cargando…", async () => {
                  await load(undefined, true);
                })
              }
            >
              Reintentar
            </Button>
          )}
        </ElevatedSurface>
      ) : (
        <>
          <div className={styles.metrics}>
            <MetricCard
              label="En tu plan"
              value={tasks.filter((task) => task.status !== "cancelled").length}
            />
            <MetricCard
              label="Completadas"
              value={tasks.filter((task) => task.status === "done").length}
            />
            <MetricCard
              label="Bloqueadas"
              value={tasks.filter((task) => task.status === "blocked").length}
              tone="warning"
            />
          </div>
          <ElevatedSurface className={styles.panel}>
            <ContextEditor
              key={data.context.version}
              context={data.context}
              busy={disabled}
              onSave={(records) =>
                run("Guardando contexto…", async () => {
                  const context = await planningApi.saveContext(
                    data.context.version,
                    records,
                  );
                  setData((current) => (current ? { ...current, context } : current));
                  setNotice(
                    "Contexto guardado. Las nuevas propuestas usarán esta información.",
                  );
                })
              }
            />
          </ElevatedSurface>
          <div className={styles.workspace}>
            <ElevatedSurface as="section" className={styles.panel}>
              <h2>Qué necesitás hacer</h2>
              <p className={styles.muted}>
                Contá tus pendientes con tus propias palabras. Agregá fechas,
                compromisos y bloqueos que debamos considerar.
              </p>
              {!data.configured && (
                <p className={styles.error}>
                  La conexión con el servicio de IA todavía no está configurada.
                </p>
              )}
              <form
                className={styles.fields}
                onSubmit={(event) => {
                  event.preventDefault();
                  void generate();
                }}
              >
                <TextAreaField
                  id="planning-input"
                  label="Tus pendientes"
                  rows={7}
                  maxLength={12000}
                  required
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Necesito revisar…, resolver… y preparar… La entrega de… es el viernes."
                />
                <TextField
                  id="planning-horizon"
                  label="Período de planificación"
                  value={horizon}
                  maxLength={120}
                  required
                  onChange={(event) => setHorizon(event.target.value)}
                />
                <TextAreaField
                  id="planning-personal"
                  label="Tu disponibilidad y compromisos"
                  optional
                  rows={3}
                  maxLength={3000}
                  value={personalContext}
                  onChange={(event) => setPersonalContext(event.target.value)}
                  placeholder="Tengo cuatro horas hoy. Estoy esperando una respuesta de…"
                />
                <Button
                  type="submit"
                  disabled={disabled || !data.configured || !input.trim()}
                >
                  <Sparkles size={18} aria-hidden="true" />
                  {busy === "Preparando tu propuesta…"
                    ? "Priorizando…"
                    : draft || accepted
                      ? "Repriorizar"
                      : "Priorizar"}
                </Button>
              </form>
              <p className={styles.muted}>
                La propuesta se guarda para revisión. Tu plan aceptado sólo cambia
                cuando lo confirmás.
              </p>
            </ElevatedSurface>
            <div className={styles.planColumn}>
              {draft ? (
                <ElevatedSurface as="section" className={styles.panel}>
                  <h2 ref={resultRef} tabIndex={-1}>
                    Propuesta para revisar
                  </h2>
                  <p>{draft.summary}</p>
                  {draft.contextVersion !== data.context.version && (
                    <p className={styles.error}>
                      El contexto cambió. Repriorizá antes de aceptar esta propuesta.
                    </p>
                  )}
                  {draft.warnings.length > 0 && (
                    <ul className={styles.warnings}>
                      {draft.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  )}
                  {draft.changes.length > 0 && (
                    <details>
                      <summary>Qué cambió</summary>
                      <ul>
                        {draft.changes.map((change, index) => (
                          <li key={index}>{change}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {draft.questions.length > 0 && (
                    <div>
                      <h3>Por aclarar</h3>
                      <ul>
                        {draft.questions.map((question, index) => (
                          <li key={index}>{question}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <TaskList
                    plan={draft}
                    editable
                    busy={disabled}
                    onChange={(updated) => setDraft({ ...draft, tasks: updated })}
                  />
                  <Button
                    disabled={disabled || draft.contextVersion !== data.context.version}
                    onClick={() =>
                      void run("Guardando plan…", async () => {
                        applyWorkspace(
                          await planningApi.accept(
                            data.workspace.version,
                            draft.id,
                            draft.tasks,
                          ),
                        );
                        setNotice("Plan aceptado y guardado.");
                      })
                    }
                  >
                    <Check size={18} aria-hidden="true" /> Aceptar plan
                  </Button>
                </ElevatedSurface>
              ) : (
                !accepted && (
                  <ElevatedSurface className={`${styles.panel} ${styles.empty}`}>
                    <ListOrdered size={32} aria-hidden="true" />
                    <h2>Un siguiente paso claro</h2>
                    <p className={styles.muted}>
                      Ingresá tus pendientes para recibir una propuesta con prioridades,
                      razones y preguntas cuando falte información.
                    </p>
                  </ElevatedSurface>
                )
              )}
              {(draft || accepted) && (
                <ElevatedSurface as="section" className={styles.panel}>
                  <h2>Conversá sobre el plan</h2>
                  <p className={styles.muted}>
                    Explicá qué cambiarías o respondé las preguntas. Las sugerencias se
                    aplican a una nueva propuesta. Aceptá primero las ediciones manuales
                    que querás conservar.
                  </p>
                  <form
                    className={styles.fields}
                    onSubmit={(event) => {
                      event.preventDefault();
                      void generate();
                    }}
                  >
                    <TextAreaField
                      id="planning-feedback"
                      label="Cambios o información adicional"
                      value={feedback}
                      maxLength={3000}
                      rows={3}
                      required
                      onChange={(event) => setFeedback(event.target.value)}
                      placeholder="Movería esta tarea primero porque…"
                    />
                    <Button
                      variant="secondary"
                      type="submit"
                      disabled={disabled || !data.configured || !feedback.trim()}
                    >
                      Revisar con esta información
                    </Button>
                  </form>
                  <details>
                    <summary>Historial de la conversación</summary>
                    <ol className={styles.conversation}>
                      {data.workspace.conversation.map((message, index) => (
                        <li key={index}>
                          <strong>
                            {message.role === "user" ? "Vos" : "Asistente"}
                          </strong>
                          <p>{message.content}</p>
                        </li>
                      ))}
                    </ol>
                  </details>
                </ElevatedSurface>
              )}
            </div>
          </div>
          {accepted && (
            <ElevatedSurface as="section" className={styles.panel}>
              <h2>Tu plan en marcha</h2>
              {next ? (
                <div className={styles.next}>
                  <span className={styles.muted}>Siguiente acción disponible</span>
                  <h3>{next.title}</h3>
                  <p>{next.nextAction}</p>
                </div>
              ) : (
                <p className={styles.muted}>
                  {tasks.every(
                    (task) => task.status === "done" || task.status === "cancelled",
                  )
                    ? "No quedan tareas pendientes en este plan. Agregá tus próximos pendientes cuando los tengás."
                    : "No hay tareas listas para iniciar. Revisá los bloqueos o las aclaraciones pendientes."}
                </p>
              )}
              {draft && (
                <p className={styles.muted}>
                  Guardar avance descarta la propuesta pendiente para evitar aplicar
                  recomendaciones sobre un estado anterior.
                </p>
              )}
              <TaskList
                key={data.workspace.version}
                plan={accepted}
                busy={disabled}
                onProgress={(task) =>
                  run("Guardando avance…", async () => {
                    applyWorkspace(
                      await planningApi.updateTask(data.workspace.version, task),
                    );
                    setNotice("Avance guardado.");
                  })
                }
              />
            </ElevatedSurface>
          )}
          <div className={styles.actions}>
            <Button
              variant="quiet"
              disabled={Boolean(busy)}
              onClick={() =>
                void run("Actualizando…", async () => {
                  await load();
                  setNotice(
                    "Información actualizada. Se conservaron tus pendientes escritos.",
                  );
                })
              }
            >
              <RefreshCw size={16} aria-hidden="true" /> Recargar plan guardado
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
