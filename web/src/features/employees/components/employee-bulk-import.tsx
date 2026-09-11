"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Download, FileUp } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button/button";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { FileUpload } from "@/components/ui/file-upload/file-upload";
import { CheckboxField } from "@/components/ui/form-field/form-field";
import {
  encodeCsv,
  MAX_IMPORT_BYTES,
  MAX_IMPORT_ROWS,
  type EmployeeImportResult,
} from "../domain/employee-csv";
import styles from "./employee-bulk-import.module.css";

const statusLabels = {
  valid: "Lista",
  invalid: "Corregir",
  created: "Creado",
  failed: "No confirmado",
};

export function EmployeeBulkImport({ departments }: { departments: string[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<EmployeeImportResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!busy) return;
    const preventExit = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", preventExit);
    return () => window.removeEventListener("beforeunload", preventExit);
  }, [busy]);

  async function submit(mode: "validate" | "import") {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    try {
      if (!file.name.toLowerCase().endsWith(".csv"))
        throw new Error("Seleccioná un archivo .csv guardado como UTF-8.");
      if (file.size > MAX_IMPORT_BYTES)
        throw new Error("El archivo supera los 128 KB.");
      const contents = mode === "validate" ? await file.text() : csv;
      const response = await fetch("/api/employees/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: contents, mode }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "No se pudo completar la operación.");
      setCsv(contents);
      setResult(payload.data);
      setConfirmed(false);
    } catch (failure) {
      setResult(null);
      setError(
        failure instanceof Error ? failure.message : "No se pudo leer el archivo.",
      );
      if (mode === "import")
        setError(
          "No se pudo confirmar el resultado. Revisá el directorio y volvé a validar el archivo antes de reintentar; algunas filas podrían haberse creado.",
        );
    } finally {
      setBusy(false);
      requestAnimationFrame(() => feedbackRef.current?.focus());
    }
  }

  function downloadReport() {
    if (!result) return;
    const content = encodeCsv([
      ["fila", "nombre", "correo", "estado", "detalle", "id_colaborador"],
      ...result.rows.map((row) => [
        row.row,
        row.name,
        row.email,
        statusLabels[row.status],
        row.errors.join("; "),
        row.employeeId ?? "",
      ]),
    ]);
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "resultado-importacion.csv";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const created = result?.rows.filter((row) => row.status === "created").length ?? 0;
  const invalid = result?.rows.filter((row) => row.errors.length).length ?? 0;

  return (
    <div className={styles.layout}>
      <ElevatedSurface as="section" className={styles.card}>
        <h2>1. Prepará el archivo</h2>
        <p>
          Descargá la plantilla, completá una fila por persona y guardala como CSV
          UTF-8. Máximo {MAX_IMPORT_ROWS} colaboradores y 128 KB por archivo.
        </p>
        <div className={styles.actions}>
          <ButtonLink
            href="/api/employees/bulk?download=template"
            variant="secondary"
            download
            prefetch={false}
          >
            <Download aria-hidden="true" size={18} /> Descargar plantilla
          </ButtonLink>
          <ButtonLink
            href="/api/employees/bulk?download=directory"
            variant="quiet"
            download
            prefetch={false}
          >
            <Download aria-hidden="true" size={18} /> Descargar directorio
          </ButtonLink>
        </div>
        <details>
          <summary>Formatos y datos requeridos</summary>
          <ul className={styles.instructions}>
            <li>
              Obligatorios: nombre, primer_apellido, correo, dia_cumpleanos,
              mes_cumpleanos, tipo_identificacion, identificacion, fecha_ingreso,
              departamento, puesto, saldo_inicial_dias y compartir_cumpleanos.
            </li>
            <li>
              Opcionales: segundo_apellido y telefono. Guardá documentos y teléfonos
              como texto para conservar sus dígitos.
            </li>
            <li>
              Tipo de identificación: cedula, dimex u otro. Cédula: 9 dígitos, con o sin
              guiones. DIMEX: 11 o 12 dígitos.
            </li>
            <li>
              Fecha de ingreso: AAAA-MM-DD o AAAA/MM/DD (ejemplo: 2026-09-10).
              Cumpleaños: día y mes numéricos en columnas separadas.
            </li>
            <li>
              Saldo inicial: un número con punto decimal e incrementos de 0.5. Confirmá
              el saldo vigente; un saldo de meses anteriores podría estar
              desactualizado.
            </li>
            <li>
              Compartir cumpleaños: si o no. Departamentos activos:{" "}
              {departments.join(", ") ||
                "No hay departamentos activos; creá uno antes de importar."}
              .
            </li>
            <li>
              Se crean personas activas con rol Colaborador, sin jefatura ni horario.
              Las invitaciones quedan pendientes para enviar desde cada detalle.
            </li>
            <li>
              El directorio descargado es un reporte de los registros existentes, no una
              plantilla para volver a importarlos. No incluye documentos de identidad.
            </li>
          </ul>
        </details>
      </ElevatedSurface>

      <ElevatedSurface as="section" className={styles.card}>
        <h2>2. Validá y revisá</h2>
        <p>
          La validación no crea registros. Si hay errores, corregí el CSV y seleccioná
          nuevamente el archivo.
        </p>
        <FileUpload
          id="employee-csv"
          label="Archivo CSV"
          selectText="Seleccionar archivo"
          accept=".csv,text/csv"
          disabled={busy}
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setResult(null);
            setCsv("");
            setError("");
            setConfirmed(false);
          }}
        />
        <div className={styles.actions}>
          <Button disabled={!file || busy} onClick={() => void submit("validate")}>
            <FileUp aria-hidden="true" size={18} />
            {busy ? "Procesando…" : "Validar archivo"}
          </Button>
        </div>
        <div
          ref={feedbackRef}
          tabIndex={-1}
          aria-live="polite"
          className={styles.feedback}
        >
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          {busy && (
            <p role="status">
              Procesando el archivo. Mantené esta página abierta hasta ver el resultado.
            </p>
          )}
          {result && (
            <p>
              {result.mode === "validate"
                ? `${result.rows.length - invalid} filas listas y ${invalid} con errores. Todavía no se creó ningún registro.`
                : `${created} colaboradores creados. ${invalid} filas requieren revisión.`}
            </p>
          )}
        </div>
        {result && (
          <>
            <ol className={styles.rows} aria-label="Resultado por fila">
              {result.rows.map((row) => (
                <li className={styles.row} key={row.row}>
                  <div className={styles.rowHeading}>
                    <strong>
                      Fila {row.row}: {row.name || "Sin nombre"}
                    </strong>
                    <span data-status={row.status}>{statusLabels[row.status]}</span>
                  </div>
                  <p>{row.email || "Sin correo"}</p>
                  {row.errors.length > 0 && (
                    <ul className={styles.error}>
                      {row.errors.map((message, index) => (
                        <li key={index}>{message}</li>
                      ))}
                    </ul>
                  )}
                  {row.employeeId && (
                    <Link href={`/admin/colaboradores/${row.employeeId}`}>
                      Ver colaborador
                    </Link>
                  )}
                </li>
              ))}
            </ol>
            <div className={styles.actions}>
              <Button onClick={downloadReport} variant="secondary" disabled={busy}>
                <Download aria-hidden="true" size={18} /> Descargar resultados
              </Button>
            </div>
            {result.canImport && result.mode === "validate" && (
              <div className={styles.confirm}>
                <h2>3. Crear colaboradores</h2>
                <CheckboxField
                  id="confirm-import"
                  label={`Revisé las ${result.rows.length} filas y confirmo la creación de los colaboradores y sus saldos iniciales.`}
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  disabled={busy}
                />
                <Button
                  disabled={!confirmed || busy}
                  onClick={() => void submit("import")}
                >
                  {busy
                    ? "Creando colaboradores…"
                    : `Crear ${result.rows.length} colaboradores`}
                </Button>
              </div>
            )}
            {result.mode === "import" && (
              <p>
                Las filas creadas ya están guardadas. Para reintentar, quitá esas filas
                del CSV, corregí las pendientes y validá el archivo nuevamente.
              </p>
            )}
          </>
        )}
      </ElevatedSurface>
    </div>
  );
}
