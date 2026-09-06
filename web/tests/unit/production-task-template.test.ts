import ExcelJS from "exceljs";
import { describe, expect, it, vi } from "vitest";

import { createProductionTaskTemplateBuffer } from "@/features/production-tasks/server/production-task-template-service";

const mocks = vi.hoisted(() => ({
  listActiveEmployees: vi.fn(),
  listProductionAreas: vi.fn(),
  requirePlatformUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/features/auth/server/require-platform-user", () => ({
  requirePlatformUser: mocks.requirePlatformUser,
}));
vi.mock("@/features/employees/integrations/production-task-employee-adapter", () => ({
  productionTaskEmployeeAdapter: {
    listActiveEmployees: mocks.listActiveEmployees,
  },
}));
vi.mock("@/features/production-tasks/server/production-task-repository", () => ({
  findProductionPlanById: vi.fn(),
  listProductionAreas: mocks.listProductionAreas,
}));

describe("official production task template", () => {
  it("contains a protected redacted catalog, canonical areas, and a machine-readable version", async () => {
    mocks.requirePlatformUser.mockResolvedValue({ platformUser: { id: "actor" } });
    mocks.listProductionAreas.mockResolvedValue([
      { _id: { toHexString: () => "area" }, name: "Cocina" },
    ]);
    mocks.listActiveEmployees.mockResolvedValue([
      {
        displayName: "Ana Mora",
        email: "private@example.com",
        employeeCode: "DNA-0001",
        employeeId: "employee",
      },
    ]);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await createProductionTaskTemplateBuffer());

    expect(workbook.getWorksheet("_Configuración")?.getCell("B2").value).toBe("1");
    expect(workbook.getWorksheet("_Configuración")?.state).toBe("veryHidden");
    expect(
      (
        workbook.getWorksheet("Colaboradores") as unknown as {
          model: { sheetProtection?: { sheet?: boolean } };
        }
      ).model.sheetProtection?.sheet,
    ).toBe(true);
    expect(
      workbook.getWorksheet("Colaboradores")?.getSheetValues().join(" "),
    ).toContain("DNA-0001");
    expect(
      JSON.stringify(workbook.getWorksheet("Colaboradores")?.getSheetValues()),
    ).not.toContain("private@example.com");
    expect(workbook.getWorksheet("Tareas")?.getCell("F3").dataValidation.type).toBe(
      "list",
    );
  });
});
