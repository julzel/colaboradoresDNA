import { ObjectId } from "mongodb";
import ExcelJS from "exceljs";
import { describe, expect, it, vi } from "vitest";
import { parseProductionCsv } from "@/features/production-tasks/server/production-task-csv";
import { parseProductionWorkbook } from "@/features/production-tasks/server/production-task-import-parser";
import { createProductionImportPreviewResult } from "@/features/production-tasks/application/production-task-import-query";
import type { ProductionImportPreviewDocument } from "@/features/production-tasks/domain/production-task-import";
import type { ProductionTaskEmployee } from "@/features/production-tasks/integrations/production-task-employee-port";

vi.mock("server-only", () => ({}));
const employeeId = new ObjectId(),
  areaId = new ObjectId();
const employees: ProductionTaskEmployee[] = [
  {
    employeeId: employeeId.toHexString(),
    employeeCode: "DNA-0001",
    displayName: "Synthetic Person",
    email: "private@invalid.test",
    platformRole: "collaborator",
    platformUserId: new ObjectId().toHexString(),
  },
];
const areas = [
  {
    _id: areaId,
    name: "Cocina",
    normalizedName: "cocina",
    sortOrder: 0,
    status: "active" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];
function preview(overrides = {}): ProductionImportPreviewDocument {
  return {
    _id: new ObjectId(),
    actorPlatformUserId: new ObjectId(),
    committedAt: null,
    createdAt: new Date(),
    expiresAt: new Date(),
    originalFileName: "tareas.csv",
    status: "preview",
    version: 1,
    workbookHash: "hash",
    sheets: [
      {
        mode: "replace",
        name: "Tareas",
        selected: true,
        weekStart: "2026-09-07",
        rows: [
          {
            key: "0:2",
            rowNumber: 2,
            areaId,
            areaText: "Cocina",
            assigneeTexts: ["DNA-0001"],
            assigneeEmployeeIds: [employeeId],
            dayText: "Lunes",
            description: "Preparar",
            subject: "Producto",
            hasFormula: false,
            ...overrides,
          },
        ],
      },
    ],
  };
}
function result(overrides = {}) {
  return createProductionImportPreviewResult({
    areas,
    employees,
    preview: preview(overrides),
  });
}

describe("weekly tasks CSV and validation", () => {
  it("rejects forged ZIP expansion sizes before loading the workbook", async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("Tareas").addRows([
      ["Día", "Área", "Producto", "Encargado 1", "Tarea"],
      ["Lunes", "Cocina", "", "DNA-0001", "Preparar"],
    ]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const directory = buffer.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    expect(directory).toBeGreaterThan(0);
    buffer.writeUInt32LE(0, directory + 24);
    await expect(parseProductionWorkbook(buffer)).rejects.toMatchObject({
      code: "limits_exceeded",
    });
  });
  it("handles BOM, quoted separators, escaped quotes, CRLF, and multiline tasks", () => {
    expect(
      parseProductionCsv(
        '\uFEFFA,B\r\n"uno,dos","texto ""literal""\nsegunda línea"\r\n',
      ),
    ).toEqual([
      ["A", "B"],
      ["uno,dos", 'texto "literal"\nsegunda línea'],
    ]);
    expect(parseProductionCsv("A;B\n1;2")).toEqual([
      ["A", "B"],
      ["1", "2"],
    ]);
  });
  it.each(['A,B\n"unfinished', 'A,B\n"closed"junk,x', 'A,B\na"quote,x'])(
    "rejects malformed quoting: %s",
    (csv) => expect(() => parseProductionCsv(csv)).toThrow(),
  );
  it("parses CSV through the canonical workbook row pipeline", async () => {
    const file = Buffer.from(
      "Fecha,Área de trabajo,Producto,Encargado 1,Tarea\n2026/09/07,Cocina,Producto,DNA-0001,Preparar",
    );
    const parsed = await parseProductionWorkbook(file, "tareas.csv");
    expect(parsed.sheets[0]?.rows[0]).toMatchObject({
      dateText: "2026/09/07",
      assigneeTexts: ["DNA-0001"],
      description: "Preparar",
    });
  });
  it("accepts dates with slashes and blank weekdays", () => {
    const value = result({ dateText: "2026/09/07", dayText: "" });
    expect(value.canCommit).toBe(true);
    expect(value.sheets[0]?.rows[0]?.workDate).toBe("2026-09-07");
    expect(JSON.stringify(value)).not.toContain("private@invalid.test");
  });
  it.each([
    [{ dateText: "2026-02-30" }, "date_invalid"],
    [{ dateText: "2026-09-14" }, "date_outside_week"],
    [{ dateText: "2026-09-08" }, "day_mismatch"],
    [{ assigneeTexts: ["DNA-0001", "Unknown"] }, "assignee_unknown"],
    [{ assigneeEmployeeIds: [] }, "assignee_unknown"],
  ])(
    "blocks invalid dates and partially resolved shared assignments",
    (overrides, code) => {
      const value = result(overrides);
      expect(value.canCommit).toBe(false);
      expect(value.sheets[0]?.rows[0]?.issues).toContainEqual({ code, tone: "error" });
    },
  );
  it("blocks duplicated target weeks and rows", () => {
    const value = preview();
    value.sheets.push({ ...value.sheets[0]!, name: "Otra" });
    expect(
      createProductionImportPreviewResult({ areas, employees, preview: value })
        .canCommit,
    ).toBe(false);
    value.sheets.pop();
    value.sheets[0]!.rows.push({
      ...value.sheets[0]!.rows[0]!,
      key: "0:3",
      rowNumber: 3,
    });
    expect(
      createProductionImportPreviewResult({ areas, employees, preview: value })
        .sheets[0]?.rows[1]?.issues,
    ).toContainEqual({ code: "duplicate", tone: "error" });
  });
  it("supports native Excel dates without changing their calendar day", async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("Tareas").addRows([
      ["Fecha", "Área", "Producto", "Encargado 1", "Tarea"],
      [new Date("2026-09-07T00:00:00Z"), "Cocina", "", "DNA-0001", "Preparar"],
    ]);
    const parsed = await parseProductionWorkbook(
      Buffer.from(await workbook.xlsx.writeBuffer()),
    );
    expect(parsed.sheets[0]?.rows[0]?.dateText).toBe("2026-09-07");
  });
  it("rejects oversized CSV, invalid UTF-8 and unsupported files", async () => {
    await expect(
      parseProductionWorkbook(Buffer.alloc(8 * 1024 * 1024 + 1), "file.csv"),
    ).rejects.toMatchObject({ code: "file_too_large" });
    await expect(
      parseProductionWorkbook(Buffer.from([0xff]), "file.csv"),
    ).rejects.toMatchObject({ code: "invalid_workbook" });
    await expect(
      parseProductionWorkbook(Buffer.from("csv"), "file.xlsm"),
    ).rejects.toMatchObject({ code: "invalid_workbook" });
  });
});
