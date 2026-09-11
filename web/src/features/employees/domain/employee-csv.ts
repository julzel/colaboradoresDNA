import { z } from "zod";

import { employeeInputSchema } from "./employee";
import { normalizeSearchText } from "./shared";
import { ptoOpeningBalanceDaysSchema } from "@/features/pto/domain/pto";

export const MAX_IMPORT_ROWS = 50;
export const MAX_IMPORT_BYTES = 128_000;
export const employeeCsvColumns = [
  "nombre",
  "primer_apellido",
  "segundo_apellido",
  "correo",
  "telefono",
  "dia_cumpleanos",
  "mes_cumpleanos",
  "tipo_identificacion",
  "identificacion",
  "fecha_ingreso",
  "departamento",
  "puesto",
  "saldo_inicial_dias",
  "compartir_cumpleanos",
] as const;
export type EmployeeCsvColumn = (typeof employeeCsvColumns)[number];
export type EmployeeCsvRecord = Record<EmployeeCsvColumn, string>;
export type ImportRowResult = {
  row: number;
  name: string;
  email: string;
  status: "valid" | "invalid" | "created" | "failed";
  errors: string[];
  employeeId?: string;
};
export type EmployeeImportResult = {
  mode: "validate" | "import";
  canImport: boolean;
  rows: ImportRowResult[];
};

export class EmployeeCsvError extends Error {}

// RFC 4180 quoting, UTF-8 BOM, CRLF and semicolon-delimited spreadsheet exports.
export function parseCsv(text: string): string[][] {
  text = text.replace(/^\uFEFF/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.includes(";") && !firstLine.includes(",") ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let closed = false;
  function endCell() {
    row.push(cell.trim());
    cell = "";
    closed = false;
  }
  function endRow() {
    endCell();
    rows.push(row);
    row = [];
  }
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += char;
    } else if (char === delimiter) endCell();
    else if (char === "\r" || char === "\n") {
      endRow();
      if (char === "\r" && text[i + 1] === "\n") i++;
    } else if (char === '"' && cell === "" && !closed) quoted = true;
    else if (closed || char === '"')
      throw new EmployeeCsvError(
        "El CSV tiene comillas mal cerradas. Volvé a exportarlo como CSV UTF-8.",
      );
    else cell += char;
    if (row.length > 30 || rows.length > MAX_IMPORT_ROWS + 1)
      throw new EmployeeCsvError(
        `El archivo admite hasta ${MAX_IMPORT_ROWS} colaboradores y las columnas de la plantilla.`,
      );
  }
  if (quoted)
    throw new EmployeeCsvError("El CSV tiene una celda con comillas sin cerrar.");
  if (cell || row.length || closed) endRow();
  return rows;
}

export function readEmployeeCsv(text: string) {
  const [header, ...rows] = parseCsv(text);
  if (!header) throw new EmployeeCsvError("El archivo está vacío.");
  const missing = employeeCsvColumns.filter((column) => !header.includes(column));
  const extra = header.filter(
    (column) => !employeeCsvColumns.includes(column as EmployeeCsvColumn),
  );
  if (missing.length || extra.length || new Set(header).size !== header.length)
    throw new EmployeeCsvError(
      `Usá las columnas de la plantilla. Faltan: ${missing.join(", ") || "ninguna"}. Columnas no reconocidas: ${extra.join(", ") || "ninguna"}. No repitás encabezados.`,
    );
  const records = rows
    .map((values, index) => ({ values, row: index + 2 }))
    .filter(({ values }) => values.some(Boolean));
  if (!records.length)
    throw new EmployeeCsvError(
      "Agregá al menos un colaborador debajo de los encabezados.",
    );
  if (records.length > MAX_IMPORT_ROWS)
    throw new EmployeeCsvError(
      `Subí hasta ${MAX_IMPORT_ROWS} colaboradores por archivo.`,
    );
  return records.map(({ values, row }) => ({
    row,
    record: Object.fromEntries(
      employeeCsvColumns.map((key) => [key, values[header.indexOf(key)] ?? ""]),
    ) as EmployeeCsvRecord,
    errors:
      values.length === header.length
        ? []
        : ["La cantidad de celdas no coincide con los encabezados."],
  }));
}

export function validateEmployeeCsvRecord(
  record: EmployeeCsvRecord,
  departments: { id: string; name: string }[],
) {
  const errors: string[] = [];
  const employmentStartedOn = /^\d{4}\/\d{2}\/\d{2}$/.test(record.fecha_ingreso.trim())
    ? record.fecha_ingreso.trim().replaceAll("/", "-")
    : record.fecha_ingreso;
  const department = departments.find(
    (item) =>
      normalizeSearchText(item.name) === normalizeSearchText(record.departamento),
  );
  if (!department)
    errors.push("departamento: elegí un departamento activo de la lista.");
  const type = { cedula: "national_id", dimex: "residence_id", otro: "other" }[
    normalizeSearchText(record.tipo_identificacion)
  ];
  const sharing = normalizeSearchText(record.compartir_cumpleanos);
  if (!["si", "no"].includes(sharing))
    errors.push("compartir_cumpleanos: usá si o no.");
  const employee = employeeInputSchema.safeParse({
    givenNames: record.nombre,
    firstSurname: record.primer_apellido,
    secondSurname: record.segundo_apellido || null,
    birthDay: record.dia_cumpleanos,
    birthMonth: record.mes_cumpleanos,
    identification: { type, value: record.identificacion },
    phoneNumber: record.telefono || null,
    employmentStartedOn,
    employmentStatus: "active",
    employmentEndedOn: null,
    platformUserId: "000000000000000000000001",
    shareBirthdayOnCalendar: sharing === "si",
  });
  const labels: Record<string, string> = {
    givenNames: "nombre",
    firstSurname: "primer_apellido",
    secondSurname: "segundo_apellido",
    birthDay: "dia_cumpleanos",
    birthMonth: "mes_cumpleanos",
    identification: "identificacion",
    phoneNumber: "telefono",
    employmentStartedOn: "fecha_ingreso",
  };
  if (!employee.success)
    errors.push(
      ...employee.error.issues.map(
        (issue) =>
          `${labels[String(issue.path[0])] ?? issue.path.join(".")}: ${issue.message}`,
      ),
    );
  const email = z.string().trim().email().max(254).safeParse(record.correo);
  if (!email.success) errors.push("correo: ingresá un correo electrónico válido.");
  const position = z.string().trim().min(1).max(120).safeParse(record.puesto);
  if (!position.success) errors.push("puesto: ingresá entre 1 y 120 caracteres.");
  const balance = ptoOpeningBalanceDaysSchema.safeParse(record.saldo_inicial_dias);
  if (
    !record.saldo_inicial_dias ||
    !balance.success ||
    !Number.isSafeInteger(balance.data)
  )
    errors.push(
      "saldo_inicial_dias: indicá un número en incrementos de 0.5; puede ser 0 o negativo.",
    );
  if (
    errors.length ||
    !employee.success ||
    !email.success ||
    !position.success ||
    !balance.success ||
    !department
  )
    return { errors, input: null };
  return {
    errors,
    input: {
      access: { email: email.data.toLowerCase(), role: "collaborator" as const },
      employee: {
        ...employee.data,
        phoneNumber: employee.data.phoneNumber?.displayValue ?? null,
      },
      assignment: {
        departmentId: department.id,
        positionTitle: position.data,
        effectiveFrom: employmentStartedOn,
        effectiveTo: null,
        managerEmployeeId: null,
      },
      openingPtoBalanceUnits: balance.data,
    },
  };
}

export function encodeCsv(rows: readonly (readonly (string | number | null)[])[]) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            let text = String(value ?? "");
            // Quotes alone don't stop spreadsheet formula execution.
            if (/^[\s]*[=+@-]/u.test(text)) text = "'" + text;
            return '"' + text.replaceAll('"', '""') + '"';
          })
          .join(","),
      )
      .join("\r\n") +
    "\r\n"
  );
}
