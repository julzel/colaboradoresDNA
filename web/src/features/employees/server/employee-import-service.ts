import "server-only";

import { MongoServerError } from "mongodb";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";
import type { PlatformUserDocument } from "@/features/auth/domain/platform-user";
import type { EmployeeDocument } from "../domain/employee";
import { EmployeeDomainError } from "../domain/errors";
import {
  readEmployeeCsv,
  validateEmployeeCsvRecord,
  type EmployeeImportResult,
  type ImportRowResult,
} from "../domain/employee-csv";
import { getDatabase } from "@/lib/server/mongodb";
import { listDepartments } from "./department-repository";
import { createEmployeeWithAccess } from "./employee-service";
import { listEmployeeDirectoryForAdministration } from "./employee-read-repository";
import { parseEmployeeDirectoryQuery } from "../domain/employee-directory-query";
import { encodeCsv } from "../domain/employee-csv";

export async function getEmployeeImportOptions() {
  await requirePlatformUser({ roles: ["administrator"] });
  return (await listDepartments()).map((department) => department.name);
}

export async function exportEmployeeDirectoryCsv() {
  await requirePlatformUser({ roles: ["administrator"] });
  const directory = await listEmployeeDirectoryForAdministration(
    parseEmployeeDirectoryQuery({}),
    { paginate: false },
  );
  return encodeCsv([
    [
      "codigo",
      "nombre",
      "departamento",
      "puesto",
      "jefatura",
      "fecha_ingreso",
      "estado_laboral",
      "estado_acceso",
      "rol",
    ],
    ...directory.items.map((item) => [
      item.employeeCode,
      item.displayName,
      item.departmentName,
      item.positionTitle,
      item.managerName,
      item.employmentStartedOn,
      item.employmentStatus,
      item.accessStatus,
      item.platformRole,
    ]),
  ]);
}

export async function processEmployeeImport(
  csv: string,
  mode: "validate" | "import",
): Promise<EmployeeImportResult> {
  await requirePlatformUser({ roles: ["administrator"] });
  const source = readEmployeeCsv(csv);
  const departments = await listDepartments();
  const prepared = source.map(({ record, row, errors }) => {
    const validated = validateEmployeeCsvRecord(record, departments);
    return {
      record,
      row,
      input: validated.input,
      errors: [...errors, ...validated.errors],
    };
  });
  const database = await getDatabase();
  const emails = prepared.map(({ record }) => record.correo.toLowerCase());
  const identifiers = prepared.flatMap(({ input }) =>
    input
      ? [
          {
            "identification.type": input.employee.identification.type,
            "identification.normalizedValue":
              input.employee.identification.normalizedValue,
          },
        ]
      : [],
  );
  const [existingUsers, existingEmployees] = await Promise.all([
    database
      .collection<PlatformUserDocument>("platform_users")
      .find(
        { normalizedEmail: { $in: emails } },
        { projection: { normalizedEmail: 1 } },
      )
      .toArray(),
    identifiers.length
      ? database
          .collection<EmployeeDocument>("employees")
          .find({ $or: identifiers }, { projection: { identification: 1 } })
          .toArray()
      : [],
  ]);
  const takenEmails = new Set(existingUsers.map((user) => user.normalizedEmail));
  const idKey = (type: string, value: string) => `${type}:${value}`;
  const takenIds = new Set(
    existingEmployees.map(({ identification: id }) =>
      idKey(id.type, id.normalizedValue),
    ),
  );
  const emailCounts = new Map<string, number>();
  const idCounts = new Map<string, number>();
  for (const { record, input } of prepared) {
    const email = record.correo.toLowerCase();
    emailCounts.set(email, (emailCounts.get(email) ?? 0) + 1);
    if (input) {
      const id = input.employee.identification;
      const key = idKey(id.type, id.normalizedValue);
      idCounts.set(key, (idCounts.get(key) ?? 0) + 1);
    }
  }
  const rows: ImportRowResult[] = prepared.map(({ row, record, input, errors }) => {
    const email = record.correo.toLowerCase();
    if (takenEmails.has(email))
      errors.push("correo: ya existe una cuenta con este correo.");
    if ((emailCounts.get(email) ?? 0) > 1)
      errors.push("correo: está repetido en el archivo.");
    if (input) {
      const id = input.employee.identification;
      const key = idKey(id.type, id.normalizedValue);
      if (takenIds.has(key))
        errors.push("identificacion: ya existe un colaborador con este documento.");
      if ((idCounts.get(key) ?? 0) > 1)
        errors.push("identificacion: está repetida en el archivo.");
    }
    return {
      row,
      name: [record.nombre, record.primer_apellido, record.segundo_apellido]
        .filter(Boolean)
        .join(" "),
      email,
      errors,
      status: errors.length ? "invalid" : "valid",
    };
  });
  const canImport = rows.every((row) => row.status === "valid");
  // Validate again on commit: never trust a client preview or its derived fields.
  if (mode === "validate" || !canImport) return { mode, canImport, rows };
  for (const [index, preparedRow] of prepared.entries()) {
    const row = rows[index]!;
    try {
      // Account, employee, assignment, opening balance and actor audit commit together.
      // Invitations and schedules remain pending; no outbound email during bulk creation.
      const result = await createEmployeeWithAccess(preparedRow.input!);
      row.status = "created";
      row.employeeId = result.employee.id;
    } catch (error) {
      row.status = "failed";
      row.errors = [
        (error instanceof MongoServerError && error.code === 11000) ||
        (error instanceof EmployeeDomainError && error.code === "employee_exists")
          ? "El correo o la identificación ya fue registrado. No se creó un duplicado."
          : error instanceof EmployeeDomainError && error.code === "department_inactive"
            ? "El departamento dejó de estar activo. Revisá la fila antes de reintentar."
            : "No se pudo confirmar la creación. Revisá el directorio y volvé a validar antes de reintentar.",
      ];
    }
  }
  return { mode, canImport: false, rows };
}
