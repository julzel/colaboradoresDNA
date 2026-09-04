import ExcelJS from "exceljs";
import { describe, expect, it, vi } from "vitest";

import {
  inferWeekStartFromSheetName,
  splitLegacyAssignees,
} from "@/features/production-tasks/domain/production-task-import";
import { parseProductionWorkbook } from "@/features/production-tasks/server/production-task-import-parser";

vi.mock("server-only", () => ({}));

describe("production workbook import", () => {
  it("recognizes legacy week names and assignee separators", () => {
    expect(inferWeekStartFromSheetName("Semana 31 agosto", 2026)).toBe("2026-08-31");
    expect(inferWeekStartFromSheetName("28 julio - 1 agosto", 2026)).toBe("2026-07-27");
    expect(splitLegacyAssignees("Ana, Luis y María")).toEqual(["Ana", "Luis", "María"]);
  });

  it("parses useful rows while forward-filling merged-style day and area values", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("31 agosto");
    sheet.addRow(["Día", "Área de trabajo", "Producto", "Encargada", "Tarea"]);
    sheet.addRow(["Martes", "Cocina", "Producto A", "DNA-0001", "Mezclar"]);
    sheet.addRow(["", "", "Producto B", "Ana y Luis", "Empacar"]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    await expect(parseProductionWorkbook(buffer)).resolves.toMatchObject({
      hash: expect.stringMatching(/^[a-f\d]{64}$/),
      sheets: [
        {
          name: "31 agosto",
          rows: [
            expect.objectContaining({ areaText: "Cocina", dayText: "Martes" }),
            expect.objectContaining({
              areaText: "Cocina",
              assigneeTexts: ["Ana", "Luis"],
              dayText: "Martes",
            }),
          ],
        },
      ],
    });
  });

  it("rejects content that is not an XLSX archive", async () => {
    await expect(
      parseProductionWorkbook(Buffer.from("not a workbook")),
    ).rejects.toMatchObject({ code: "limits_exceeded" });
  });
});
