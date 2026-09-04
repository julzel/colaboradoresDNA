import "server-only";

import ExcelJS from "exceljs";

import { requirePlatformUser } from "@/features/auth/server/require-platform-user";
import { productionTaskEmployeeAdapter } from "@/features/employees/integrations/production-task-employee-adapter";
import { listProductionAreas } from "@/features/production-tasks/server/production-task-repository";
import { findProductionPlanById } from "@/features/production-tasks/server/production-task-repository";
import { ProductionTaskDomainError } from "@/features/production-tasks/domain/shared";

const brand = "31C7CF";
const dark = "102F2B";
const pale = "DDF7F7";

export async function createProductionTaskTemplateBuffer() {
  await requirePlatformUser({ roles: ["administrator", "supervisor"] });
  const [areas, employees] = await Promise.all([
    listProductionAreas(),
    productionTaskEmployeeAdapter.listActiveEmployees(),
  ]);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Colaboradores DNA";
  workbook.created = new Date();
  const tasks = workbook.addWorksheet("Tareas", {
    views: [{ showGridLines: false, state: "frozen", ySplit: 3 }],
  });
  const people = workbook.addWorksheet("Colaboradores", {
    views: [{ showGridLines: false, state: "frozen", ySplit: 1 }],
  });
  const areaSheet = workbook.addWorksheet("Áreas", {
    views: [{ showGridLines: false, state: "frozen", ySplit: 1 }],
  });
  const metadata = workbook.addWorksheet("_Configuración");
  metadata.state = "veryHidden";
  metadata.addRows([
    ["clave", "valor"],
    ["template_version", "1"],
    ["timezone", "America/Costa_Rica"],
  ]);

  tasks.mergeCells("A1:H1");
  tasks.getCell("A1").value = "Tareas de producción";
  tasks.getCell("A2").value = "Fecha";
  tasks.getCell("B2").value = "Día";
  tasks.getCell("C2").value = "Área de trabajo";
  tasks.getCell("D2").value = "Producto o elemento";
  tasks.getCell("E2").value = "Tarea";
  ["Encargado 1", "Encargado 2", "Encargado 3"].forEach((value, index) => {
    tasks.getCell(2, 6 + index).value = value;
  });
  for (let column = 1; column <= 8; column += 1) {
    tasks.getCell(1, column).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: brand },
    };
    tasks.getCell(1, column).font = { bold: true, color: { argb: dark }, size: 16 };
    tasks.getCell(2, column).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: dark },
    };
    tasks.getCell(2, column).font = { bold: true, color: { argb: "FFFFFF" } };
  }
  tasks.columns = [14, 14, 27, 30, 45, 18, 18, 18].map((width) => ({ width }));
  tasks.getColumn(1).numFmt = "yyyy-mm-dd";
  for (let row = 3; row <= 152; row += 1) {
    tasks.getCell(row, 3).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [`'Áreas'!$A$2:$A$${areas.length + 1}`],
    };
    for (let column = 6; column <= 8; column += 1) {
      tasks.getCell(row, column).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`'Colaboradores'!$A$2:$A$${employees.length + 1}`],
      };
    }
    tasks.getRow(row).alignment = { vertical: "top", wrapText: true };
  }
  tasks.autoFilter = "A2:H152";

  people.addRow(["Código", "Nombre"]);
  employees.forEach((employee) =>
    people.addRow([employee.employeeCode ?? "", employee.displayName]),
  );
  people.columns = [{ width: 18 }, { width: 38 }];
  areaSheet.addRow(["Área"]);
  areas.forEach((area) => areaSheet.addRow([area.name]));
  areaSheet.columns = [{ width: 34 }];
  for (const sheet of [people, areaSheet]) {
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: brand },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: dark } };
    for (let row = 2; row <= sheet.rowCount; row += 1) {
      const lastColumn = sheet === people ? 2 : 1;
      for (let column = 1; column <= lastColumn; column += 1) {
        sheet.getCell(row, column).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: pale },
        };
      }
    }
  }
  await people.protect("", {
    selectLockedCells: true,
    selectUnlockedCells: true,
  });
  return workbook.xlsx.writeBuffer();
}

export async function createProductionPlanExportBuffer(planId: string) {
  const template = await createProductionTaskTemplateBuffer();
  const [plan, employees] = await Promise.all([
    findProductionPlanById(planId),
    productionTaskEmployeeAdapter.listActiveEmployees(),
  ]);
  if (!plan) throw new ProductionTaskDomainError("plan_not_found");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(template);
  const sheet = workbook.getWorksheet("Tareas");
  if (!sheet) throw new ProductionTaskDomainError("import_invalid");
  const codeByEmployeeId = new Map(
    employees.map((employee) => [employee.employeeId, employee.employeeCode ?? ""]),
  );
  const assigneeColumnCount = Math.max(
    3,
    ...plan.tasks.map((task) => task.assigneeEmployeeIds.length),
  );
  for (let assigneeIndex = 3; assigneeIndex < assigneeColumnCount; assigneeIndex += 1) {
    const columnNumber = 6 + assigneeIndex;
    const header = sheet.getCell(2, columnNumber);
    header.value = `Encargado ${assigneeIndex + 1}`;
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: dark } };
    header.font = { bold: true, color: { argb: "FFFFFF" } };
    sheet.getColumn(columnNumber).width = 18;
    for (let row = 3; row <= 152; row += 1) {
      sheet.getCell(row, columnNumber).dataValidation = {
        allowBlank: true,
        formulae: [`'Colaboradores'!$A$2:$A$${employees.length + 1}`],
        type: "list",
      };
    }
  }
  sheet.autoFilter = {
    from: { column: 1, row: 2 },
    to: { column: 5 + assigneeColumnCount, row: 152 },
  };
  const weekdayFormatter = new Intl.DateTimeFormat("es-CR", {
    timeZone: "UTC",
    weekday: "long",
  });

  plan.tasks
    .slice()
    .sort(
      (first, second) =>
        first.workDate.localeCompare(second.workDate) ||
        first.sortOrder - second.sortOrder,
    )
    .forEach((task, index) => {
      const row = sheet.getRow(index + 3);
      row.getCell(1).value = task.workDate;
      row.getCell(2).value = weekdayFormatter.format(
        new Date(`${task.workDate}T12:00:00.000Z`),
      );
      row.getCell(3).value = task.areaLabelSnapshot;
      row.getCell(4).value = task.subject ?? "";
      row.getCell(5).value = task.description;
      task.assigneeEmployeeIds.forEach((employeeId, assigneeIndex) => {
        row.getCell(6 + assigneeIndex).value =
          codeByEmployeeId.get(employeeId.toHexString()) ?? "";
      });
    });
  workbook.subject = `Semana ${plan.weekStart}`;
  workbook.modified = new Date();
  return workbook.xlsx.writeBuffer();
}
