"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal/modal";
import { Button, ButtonLink } from "@/components/ui/button/button";
import {
  CheckboxField,
  SelectField,
  TextField,
  TextAreaField,
} from "@/components/ui/form-field/form-field";
import type {
  ProductionBoardResult,
  ProductionTaskEditOptions,
  ProductionTaskEditResult,
} from "../application/production-task-contracts";
import { TaskApiError, taskRequest } from "../presentation/client";
import { taskErrorMessage } from "../presentation/messages";
import { showFeedbackToast } from "@/components/ui/feedback/app-toast";
import styles from "./tasks.module.css";

type EditableTask = ProductionBoardResult["tasks"][number];

export function NewTaskButton({ today, date }: { today: string; date: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        aria-label="Nueva tarea"
        title="Nueva tarea"
        className={styles.importButton}
        onClick={() => setOpen(true)}
      >
        <Plus aria-hidden="true" size={20} />
        <span className={styles.importButtonLabel}>Nueva tarea</span>
      </Button>
      {open && (
        <TaskEditor
          today={today}
          initialDate={date < today ? today : date}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

export function TaskEditor({
  task,
  today,
  initialDate,
  onClose,
}: {
  task?: EditableTask;
  today: string;
  initialDate: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [date, setDate] = useState(task?.workDate ?? initialDate);
  const [areaId, setAreaId] = useState(task?.areaId ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [subject, setSubject] = useState(task?.subject ?? "");
  const [people, setPeople] = useState(task?.assigneeEmployeeIds ?? []);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<ProductionTaskEditOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [changed, setChanged] = useState(false);
  const [reload, setReload] = useState(0);
  const [conflict, setConflict] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/production-tasks/v1/tasks/options?date=${encodeURIComponent(date)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error ?? "No pudimos cargar las opciones.");
        if (!controller.signal.aborted) setOptions(result.data);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "No pudimos cargar las opciones.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [date, reload]);
  function edit() {
    setChanged(true);
    setWarnings([]);
    setAcknowledged(false);
    setError("");
  }
  async function submit(event?: FormEvent, remove = false) {
    event?.preventDefault();
    if (busy || conflict || (!remove && (!options || loading))) return;
    if (!remove && !people.length) {
      setError("Asigná al menos una persona.");
      return;
    }
    setBusy(true);
    setError("");
    const source = task
      ? { planId: task.planId, taskId: task.id, expectedTaskVersion: task.version }
      : undefined;
    try {
      const result = await taskRequest<ProductionTaskEditResult>(
        "tasks/edit",
        remove
          ? { action: "remove", source }
          : {
              action: task ? "update" : "create",
              ...(source ? { source } : {}),
              expectedTargetPlanId: options!.targetPlanId,
              acknowledgeWarnings: acknowledged,
              task: {
                workDate: date,
                areaId,
                description,
                subject,
                assigneeEmployeeIds: people,
                sortOrder: task?.sortOrder ?? 0,
              },
            },
      );
      onClose();
      showFeedbackToast(
        remove
          ? "production_task_removed"
          : task
            ? "production_task_updated"
            : "production_task_created",
      );
      router.push(`/tareas?fecha=${result.date}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos guardar la tarea.");
      if (cause instanceof TaskApiError) {
        setWarnings(cause.warnings ?? []);
        if (cause.code === "stale_version") setConflict(true);
      }
    } finally {
      setBusy(false);
    }
  }
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLocaleLowerCase("es");
  const matches =
    options?.employees.filter((person) =>
      normalize(`${person.displayName} ${person.employeeCode ?? ""}`).includes(
        normalize(search),
      ),
    ) ?? [];
  return (
    <Modal
      title={task ? "Editar tarea" : "Nueva tarea"}
      description="Los cambios se comparten con el equipo al guardar."
      variant="drawer"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className={styles.taskEditor}
        data-unsaved-changes={changed}
      >
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {conflict && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onClose();
              router.refresh();
            }}
          >
            Cerrar y actualizar plan
          </Button>
        )}
        {loading && <p role="status">Cargando colaboradores y áreas…</p>}
        {!loading && !options && (
          <Button
            variant="secondary"
            onClick={() => {
              setError("");
              setLoading(true);
              setOptions(null);
              setReload((value) => value + 1);
            }}
          >
            Reintentar
          </Button>
        )}
        <fieldset disabled={busy || conflict} className={styles.fieldset}>
          <TextField
            id="edit-task-date"
            label="Fecha"
            type="date"
            min={options?.today ?? today}
            required
            value={date}
            onChange={(event) => {
              edit();
              setLoading(true);
              setOptions(null);
              setDate(event.target.value);
            }}
          />
          <SelectField
            id="edit-task-area"
            label="Área de trabajo"
            required
            value={areaId}
            onChange={(event) => {
              edit();
              setAreaId(event.target.value);
            }}
          >
            <option value="">Seleccioná un área</option>
            {options?.areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </SelectField>
          <TextAreaField
            id="edit-task-description"
            label="Tarea"
            required
            minLength={2}
            maxLength={500}
            value={description}
            onChange={(event) => {
              edit();
              setDescription(event.target.value);
            }}
          />
          <TextField
            id="edit-task-subject"
            label="Producto o elemento"
            optional
            maxLength={240}
            value={subject}
            onChange={(event) => {
              edit();
              setSubject(event.target.value);
            }}
          />
          <fieldset className={styles.fieldset}>
            <legend>Personas encargadas ({people.length}/30)</legend>
            <div className={styles.assignees}>
              {people.map((id) => (
                <Button
                  key={id}
                  variant="quiet"
                  size="small"
                  aria-label={`Quitar ${options?.employees.find((person) => person.id === id)?.displayName ?? "colaborador"}`}
                  onClick={() => {
                    edit();
                    setPeople(people.filter((value) => value !== id));
                  }}
                >
                  {options?.employees.find((person) => person.id === id)?.displayName ??
                    (loading ? "Cargando colaborador…" : "Colaborador inactivo")}{" "}
                  ×
                </Button>
              ))}
            </div>
            <TextField
              id="edit-task-search"
              label="Buscar colaborador"
              placeholder="Nombre o código"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className={styles.employeeChoices}>
              {matches.map((person) => (
                <CheckboxField
                  key={person.id}
                  id={`edit-person-${person.id}`}
                  label={person.displayName}
                  {...(person.employeeCode ? { description: person.employeeCode } : {})}
                  checked={people.includes(person.id)}
                  disabled={!people.includes(person.id) && people.length >= 30}
                  onChange={(event) => {
                    edit();
                    setPeople(
                      event.target.checked
                        ? [...people, person.id]
                        : people.filter((id) => id !== person.id),
                    );
                  }}
                />
              ))}
            </div>
            {!matches.length && (
              <p>No hay colaboradores que coincidan con la búsqueda.</p>
            )}
          </fieldset>
          {warnings.length > 0 && (
            <div className={styles.notice}>
              <ul>
                {warnings.map((warning) => (
                  <li key={warning}>{taskErrorMessage(warning)}</li>
                ))}
              </ul>
              <CheckboxField
                id="ack-task-warning"
                label="Revisé la disponibilidad y quiero guardar la tarea."
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
              />
            </div>
          )}
          <div className={styles.editorActions}>
            <Button
              type="submit"
              disabled={loading || !options || (warnings.length > 0 && !acknowledged)}
            >
              {busy ? "Guardando…" : task ? "Guardar cambios" : "Crear tarea"}
            </Button>
            {task && (
              <Button variant="danger" onClick={() => setRemoving(true)}>
                <Trash2 aria-hidden="true" size={18} />
                Eliminar tarea
              </Button>
            )}
          </div>
          {removing && (
            <div className={styles.notice}>
              <p>
                ¿Eliminar esta tarea del plan? Se quitará para todas las personas
                asignadas. La versión anterior seguirá en el historial.
              </p>
              <div className={styles.actions}>
                <Button variant="danger" onClick={() => void submit(undefined, true)}>
                  Confirmar eliminación
                </Button>
                <Button variant="quiet" onClick={() => setRemoving(false)}>
                  Conservar tarea
                </Button>
              </div>
            </div>
          )}
          {task?.status === "completed" && (
            <p className={styles.muted}>La tarea seguirá marcada como completada.</p>
          )}
        </fieldset>
        <ButtonLink href="/tareas/historial" variant="quiet">
          Ver historial
        </ButtonLink>
      </form>
    </Modal>
  );
}
