"use client";

import { useRef, useState } from "react";
import { Download, Upload, Check } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button/button";
import {
  CheckboxField,
  SelectField,
  TextField,
} from "@/components/ui/form-field/form-field";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import type { ProductionImportPreviewResult } from "../application/production-task-contracts";
import { addCalendarDays, productionWeekStartSchema } from "../domain/shared";
import { formatTaskDate, taskErrorMessage } from "../presentation/messages";
import { taskRequest, TaskApiError } from "../presentation/client";
import styles from "./tasks.module.css";

export function TaskImport() {
  const file = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ProductionImportPreviewResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [planIds, setPlanIds] = useState<string[]>([]);
  const feedback = useRef<HTMLDivElement>(null);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (cause) {
      if (cause instanceof TaskApiError && cause.code === "stale_version" && preview) {
        const refreshed = await fetch(
          `/api/production-tasks/v1/imports/${preview.id}`,
          { cache: "no-store" },
        )
          .then(async (response) =>
            response.ok
              ? ((await response.json()).data as ProductionImportPreviewResult)
              : null,
          )
          .catch(() => null);
        if (refreshed) {
          setPreview(refreshed);
          setDirty(true);
          setConfirming(false);
          setConfirmed(false);
        }
      }
      setError(
        cause instanceof Error ? cause.message : "No pudimos completar la operación.",
      );
    } finally {
      setBusy(false);
      feedback.current?.focus();
    }
  }
  function edit(
    update: (value: ProductionImportPreviewResult) => ProductionImportPreviewResult,
  ) {
    if (!preview) return;
    setPreview(update(preview));
    setDirty(true);
    setConfirmed(false);
    setConfirming(false);
  }
  async function upload() {
    const selected = file.current?.files?.[0];
    if (!selected) {
      setError("Seleccioná un archivo XLSX o CSV.");
      return;
    }
    if (!/\.(csv|xlsx)$/i.test(selected.name) || selected.size > 8 * 1024 * 1024) {
      setError("Usá un archivo XLSX o CSV de hasta 8 MB.");
      return;
    }
    await run(async () => {
      const response = await fetch(
        `/api/production-tasks/v1/imports?filename=${encodeURIComponent(selected.name)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: selected,
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setPreview(result.data);
      setDirty(true);
      setConfirming(false);
      setConfirmed(false);
      setPlanIds([]);
    });
  }
  async function validate() {
    if (!preview) return;
    await run(async () => {
      const result = await taskRequest<ProductionImportPreviewResult>(
        "imports/configure",
        {
          previewId: preview.id,
          expectedVersion: preview.version,
          sheets: preview.sheets.map(({ name, selected, weekStart }) => ({
            name,
            selected,
            weekStart: weekStart || null,
            mode: "replace",
          })),
          rows: preview.sheets.flatMap((sheet) =>
            sheet.rows.map(({ key, areaId, assigneeEmployeeIds }) => ({
              key,
              areaId,
              assigneeEmployeeIds: assigneeEmployeeIds.filter(Boolean),
            })),
          ),
        },
      );
      setPreview(result);
      setDirty(false);
      setConfirming(false);
      setConfirmed(false);
    });
  }
  async function commit() {
    if (!preview || dirty || !confirmed) return;
    await run(async () => {
      const result = await taskRequest<{ planIds: string[] }>("imports/commit", {
        previewId: preview.id,
        expectedVersion: preview.version,
        targets: preview.targets,
        overrideConfirmed: confirmed,
      });
      setPlanIds(result.planIds);
      setPreview(null);
      setConfirming(false);
    });
  }
  return (
    <>
      <ElevatedSurface className={styles.panel}>
        <div className={styles.toolbar}>
          <h2>1. Prepará el archivo</h2>
          <ButtonLink
            href="/api/production-tasks/v1/template"
            variant="secondary"
            prefetch={false}
          >
            <Download size={18} />
            Descargar plantilla XLSX
          </ButtonLink>
        </div>
        <p>
          Usá una hoja por semana y los códigos DNA de la pestaña Colaboradores. CSV
          admite una semana. También podés cargar el formato anterior y vincular cada
          nombre durante la revisión.
        </p>
        <p className={styles.muted}>
          Columnas: Fecha o Día, Área de trabajo, Producto, Tarea y Encargado. Hasta 8
          MB y 500 tareas por semana. Cargar el archivo no publica tareas.
        </p>
        <label htmlFor="tasks-file">Archivo XLSX o CSV (UTF-8)</label>
        <input
          ref={file}
          className={styles.file}
          id="tasks-file"
          type="file"
          accept=".xlsx,.csv"
          disabled={busy}
        />
        <div className={styles.actions}>
          <Button disabled={busy} onClick={upload}>
            <Upload size={18} />
            {busy ? "Procesando…" : "Cargar y revisar"}
          </Button>
        </div>
      </ElevatedSurface>
      <div ref={feedback} tabIndex={-1} aria-live="polite">
        {error && (
          <p className={`${styles.notice} ${styles.error}`} role="alert">
            {error}
          </p>
        )}
        {busy && <p role="status">Procesando. No cerrés esta página.</p>}
      </div>
      {planIds.length > 0 && (
        <ElevatedSurface className={styles.panel}>
          <h2>
            <Check size={22} /> Importación guardada
          </h2>
          <p>
            Las semanas están en borrador. Revisá y publicá cada una para que el equipo
            pueda verlas.
          </p>
          <div className={styles.actions}>
            {planIds.map((id, index) => (
              <ButtonLink key={id} href={`/tareas/planes/${id}`}>
                Revisar semana {index + 1}
              </ButtonLink>
            ))}
          </div>
        </ElevatedSurface>
      )}
      {preview && (
        <ElevatedSurface className={styles.panel}>
          <h2>2. Confirmá fechas y personas</h2>
          <p>{preview.fileName} · La revisión vence en dos horas.</p>
          <p className={styles.muted}>
            Cada semana va de lunes a domingo. Si existen tareas, la importación
            reemplaza el borrador completo; la versión publicada se conserva hasta que
            publiques la nueva.
          </p>
          <fieldset disabled={busy} className={styles.fieldset}>
            {preview.sheets.map((sheet, sheetIndex) => {
              const startValid = productionWeekStartSchema.safeParse(
                sheet.weekStart,
              ).success;
              return (
                <section key={sheet.name} className={styles.sheet}>
                  <CheckboxField
                    id={`sheet-${sheetIndex}`}
                    label={`Importar hoja: ${sheet.name}`}
                    checked={sheet.selected}
                    onChange={(event) =>
                      edit((value) => ({
                        ...value,
                        sheets: value.sheets.map((item, index) =>
                          index === sheetIndex
                            ? { ...item, selected: event.target.checked }
                            : item,
                        ),
                      }))
                    }
                  />
                  {sheet.selected && (
                    <>
                      <div className={styles.controls}>
                        <TextField
                          id={`start-${sheetIndex}`}
                          label="Desde (lunes)"
                          type="date"
                          value={sheet.weekStart ?? ""}
                          onChange={(event) =>
                            edit((value) => ({
                              ...value,
                              sheets: value.sheets.map((item, index) =>
                                index === sheetIndex
                                  ? { ...item, weekStart: event.target.value || null }
                                  : item,
                              ),
                            }))
                          }
                          required
                          error={
                            sheet.weekStart && !startValid
                              ? "Seleccioná un lunes válido."
                              : undefined
                          }
                        />
                        <TextField
                          id={`end-${sheetIndex}`}
                          label="Hasta (domingo, inclusive)"
                          type="date"
                          readOnly
                          value={startValid ? addCalendarDays(sheet.weekStart!, 6) : ""}
                        />
                      </div>
                      <p>
                        {sheet.validCount} tareas válidas · {sheet.errorCount} filas con
                        errores ·{" "}
                        {sheet.rows.filter((row) => row.status === "skipped").length}{" "}
                        filas de plantilla omitidas
                        {dirty && " · Pendiente de validar cambios"}
                      </p>
                      <details>
                        <summary>
                          Ver {sheet.rows.length} filas y corregir identificación de
                          personas o áreas
                        </summary>
                        {sheet.rows
                          .filter((row) => row.status !== "skipped")
                          .map((row) => (
                            <details className={styles.mappingRow} key={row.key}>
                              <summary>
                                Fila {row.rowNumber} · {row.dayText || row.workDate} ·{" "}
                                {row.description || "Sin tarea"}{" "}
                                {row.issues.length > 0 &&
                                  `(${row.issues.length} observaciones)`}
                              </summary>
                              <p className={styles.muted}>
                                {row.areaText} · {row.subject}
                              </p>
                              {row.issues.map((issue, index) => (
                                <p
                                  className={
                                    issue.tone === "error" ? styles.error : styles.muted
                                  }
                                  key={index}
                                >
                                  {taskErrorMessage(issue.code)}
                                </p>
                              ))}
                              <div className={styles.mapping}>
                                <SelectField
                                  id={`area-${row.key}`}
                                  label="Área"
                                  value={row.areaId ?? ""}
                                  onChange={(event) =>
                                    edit((value) => ({
                                      ...value,
                                      sheets: value.sheets.map((item) => ({
                                        ...item,
                                        rows: item.rows.map((candidate) =>
                                          candidate.key === row.key
                                            ? {
                                                ...candidate,
                                                areaId: event.target.value || null,
                                              }
                                            : candidate,
                                        ),
                                      })),
                                    }))
                                  }
                                >
                                  <option value="">Seleccioná un área</option>
                                  {preview.areas.map((area) => (
                                    <option key={area.id} value={area.id}>
                                      {area.name}
                                    </option>
                                  ))}
                                </SelectField>
                                {Array.from(
                                  { length: Math.max(1, row.assigneeTexts.length) },
                                  (_, personIndex) => (
                                    <SelectField
                                      key={personIndex}
                                      id={`person-${row.key}-${personIndex}`}
                                      label={`Encargado: ${row.assigneeTexts[personIndex] ?? "sin asignar"}`}
                                      value={row.assigneeEmployeeIds[personIndex] ?? ""}
                                      onChange={(event) =>
                                        edit((value) => ({
                                          ...value,
                                          sheets: value.sheets.map((item) => ({
                                            ...item,
                                            rows: item.rows.map((candidate) => {
                                              if (candidate.key !== row.key)
                                                return candidate;
                                              const ids = [
                                                ...candidate.assigneeEmployeeIds,
                                              ];
                                              ids[personIndex] = event.target.value;
                                              return {
                                                ...candidate,
                                                assigneeEmployeeIds: ids,
                                              };
                                            }),
                                          })),
                                        }))
                                      }
                                    >
                                      <option value="">
                                        Identificá a esta persona
                                      </option>
                                      {preview.employees.map((employee) => (
                                        <option key={employee.id} value={employee.id}>
                                          {employee.employeeCode ?? "Sin código"} ·{" "}
                                          {employee.displayName}
                                        </option>
                                      ))}
                                    </SelectField>
                                  ),
                                )}
                              </div>
                            </details>
                          ))}
                      </details>
                    </>
                  )}
                </section>
              );
            })}
          </fieldset>
          {!dirty && !preview.canCommit && (
            <p className={styles.notice}>
              Corregí las filas con errores. Seleccioná al menos una hoja con tareas y
              no repitás la misma semana en dos hojas (máximo 500 tareas por semana).
            </p>
          )}
          <div className={styles.actions}>
            <Button disabled={busy} variant="secondary" onClick={validate}>
              Validar fechas y asignaciones
            </Button>
            <Button
              disabled={busy || dirty || !preview.canCommit}
              onClick={() => setConfirming(true)}
            >
              Continuar
            </Button>
          </div>
          {confirming && (
            <div className={styles.confirmation}>
              <h2>3. Confirmá la importación</h2>
              <ul>
                {preview.targets.map((target) => (
                  <li key={target.weekStart}>
                    {formatTaskDate(target.weekStart)} –{" "}
                    {formatTaskDate(addCalendarDays(target.weekStart, 6))}:{" "}
                    {target.draft || target.published
                      ? "ya tiene tareas; se reemplazará el borrador completo"
                      : "nueva semana"}
                    .
                  </li>
                ))}
              </ul>
              <CheckboxField
                id="confirm-import"
                label="Revisé las fechas, todas las asignaciones y los reemplazos indicados. Confirmo la importación."
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              <div className={styles.actions}>
                <Button disabled={busy || !confirmed} onClick={commit}>
                  Confirmar e importar borradores
                </Button>
                <Button
                  disabled={busy}
                  variant="quiet"
                  onClick={() => setConfirming(false)}
                >
                  Volver a revisar
                </Button>
              </div>
            </div>
          )}
        </ElevatedSurface>
      )}
    </>
  );
}
