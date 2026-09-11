import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  employeeCsvColumns,
  encodeCsv,
  parseCsv,
  readEmployeeCsv,
  validateEmployeeCsvRecord,
  type EmployeeCsvRecord,
} from "@/features/employees/domain/employee-csv";

export const validRecord: EmployeeCsvRecord = {
  nombre: "Ana",
  primer_apellido: "Pérez",
  segundo_apellido: "",
  correo: "ana@example.com",
  telefono: "88887777",
  dia_cumpleanos: "29",
  mes_cumpleanos: "2",
  tipo_identificacion: "cedula",
  identificacion: "1-2345-6789",
  fecha_ingreso: "2026-09-01",
  departamento: "Producción",
  puesto: "Operadora",
  saldo_inicial_dias: "5.5",
  compartir_cumpleanos: "no",
};
export function csvFor(records: EmployeeCsvRecord[]) {
  return encodeCsv([
    employeeCsvColumns,
    ...records.map((record) => employeeCsvColumns.map((key) => record[key])),
  ]);
}
const departments = [{ id: "507f1f77bcf86cd799439011", name: "Producción" }];

describe("employee CSV", () => {
  it("preserves identifiers, quotes, accents and quoted newlines", () => {
    const csv = csvFor([
      {
        ...validRecord,
        nombre: 'Ana, "María"\nElena',
        identificacion: "155835870808",
        tipo_identificacion: "dimex",
      },
    ]);
    const [row] = readEmployeeCsv(csv);
    expect(row?.record.nombre).toBe('Ana, "María"\nElena');
    expect(row?.record.identificacion).toBe("155835870808");
    expect(row?.row).toBe(2);
    expect(validateEmployeeCsvRecord(row!.record, departments).input).not.toBeNull();
  });
  it("accepts reordered headers, semicolons and BOM", () => {
    const columns = [...employeeCsvColumns].reverse();
    const [row] = readEmployeeCsv(
      "\uFEFF" +
        columns.join(";") +
        "\r\n" +
        columns.map((key) => validRecord[key]).join(";"),
    );
    expect(row?.record).toEqual(validRecord);
  });
  it("rejects unexpected headers, malformed quotes, empty files and excess rows", () => {
    expect(() => readEmployeeCsv("Asociado,Puesto\nAna,Operadora")).toThrow(
      "plantilla",
    );
    expect(() => parseCsv('a,b\n"unclosed')).toThrow("comillas");
    expect(() => parseCsv('a,b\n"Ana"oops,b')).toThrow("comillas");
    expect(() => readEmployeeCsv("")).toThrow();
    expect(() => readEmployeeCsv(encodeCsv([employeeCsvColumns]))).toThrow("al menos");
    expect(() =>
      readEmployeeCsv(csvFor(Array.from({ length: 51 }, () => validRecord))),
    ).toThrow("50");
  });
  it("reports uneven row widths without silently dropping fields", () => {
    const rows = readEmployeeCsv(employeeCsvColumns.join(",") + "\nAna,Perez");
    expect(rows[0]?.errors).toHaveLength(1);
  });
  it("normalizes values and uses explicit defaults for permissions and sharing", () => {
    const result = validateEmployeeCsvRecord(
      { ...validRecord, departamento: "produccion", correo: "ANA@example.com" },
      departments,
    );
    expect(result.errors).toEqual([]);
    expect(result.input?.openingPtoBalanceUnits).toBe(11);
    expect(result.input?.access).toEqual({
      email: "ana@example.com",
      role: "collaborator",
    });
    expect(result.input?.employee.shareBirthdayOnCalendar).toBe(false);
    expect(result.input?.assignment.managerEmployeeId).toBeNull();
  });
  it("accepts slash-separated hire dates and stores the canonical ISO format", () => {
    const result = validateEmployeeCsvRecord(
      { ...validRecord, fecha_ingreso: "2026/09/01" },
      departments,
    );

    expect(result.errors).toEqual([]);
    expect(result.input?.employee.employmentStartedOn).toBe("2026-09-01");
    expect(result.input?.assignment.effectiveFrom).toBe("2026-09-01");
  });
  it.each([
    ["correo", "not-an-email"],
    ["identificacion", "123"],
    ["fecha_ingreso", "sep 2022"],
    ["fecha_ingreso", "2026-02-30"],
    ["mes_cumpleanos", "0"],
    ["departamento", "Missing"],
    ["saldo_inicial_dias", ""],
    ["saldo_inicial_dias", "0.25"],
    ["saldo_inicial_dias", "1e100"],
    ["compartir_cumpleanos", "maybe"],
  ])("rejects invalid %s", (field, value) => {
    expect(
      validateEmployeeCsvRecord({ ...validRecord, [field]: value }, departments).input,
    ).toBeNull();
  });
  it("permits zero and negative opening balances but not impossible birthdays", () => {
    for (const balance of ["0", "-2.5"])
      expect(
        validateEmployeeCsvRecord(
          { ...validRecord, saldo_inicial_dias: balance },
          departments,
        ).input,
      ).not.toBeNull();
    expect(
      validateEmployeeCsvRecord(
        { ...validRecord, dia_cumpleanos: "31", mes_cumpleanos: "4" },
        departments,
      ).input,
    ).toBeNull();
  });
  it("prevents formulas in downloaded text", () => {
    expect(
      parseCsv(
        encodeCsv([["=HYPERLINK(1)", "+cmd", "@SUM(1)", "-cmd", " \t=1+1", 'A,"B"']]),
      )[0],
    ).toEqual(["'=HYPERLINK(1)", "'+cmd", "'@SUM(1)", "'-cmd", "' \t=1+1", 'A,"B"']);
  });
  it("keeps the deliverable template aligned with the upload contract", () => {
    const header = readFileSync("../docs/templates/colaboradores.csv", "utf8").trim();
    expect(header.split(",")).toEqual(employeeCsvColumns);
  });
});
