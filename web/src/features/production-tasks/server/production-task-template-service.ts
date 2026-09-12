import "server-only";

import ExcelJS from "exceljs";

import { requireProductionTaskManager } from "./production-task-authorization";
import { productionTaskEmployeeAdapter } from "@/features/employees/integrations/production-task-employee-adapter";
import { listProductionAreas } from "@/features/production-tasks/server/production-task-repository";
import { findProductionPlanById } from "@/features/production-tasks/server/production-task-repository";
import { ProductionTaskDomainError } from "@/features/production-tasks/domain/shared";

const brand = "31C7CF";
const dark = "102F2B";
const pale = "DDF7F7";

export async function createProductionTaskTemplateBuffer() {
  await requireProductionTaskManager();
  const [areas, employees] = await Promise.all([
    listProductionAreas(),
    productionTaskEmployeeAdapter.listActiveEmployees(),
  ]);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Colaboradores DNA";
  workbook.created = new Date();
  const tasks = workbook.addWorksheet("Tareas", {
    views: [{ showGridLines: false, state: "frozen", ySplit: 2 }],
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
    ["template_version", "2"],
    ["timezone", "America/Costa_Rica"],
  ]);

  tasks.mergeCells("A1:F1");
  tasks.getCell("A1").value = "Tareas de producción";
  tasks.getCell("A2").value = "Fecha";
  tasks.getCell("B2").value = "Día";
  tasks.getCell("C2").value = "Área de trabajo";
  tasks.getCell("D2").value = "Producto o elemento";
  tasks.getCell("E2").value = "Tarea";
  tasks.getCell("F2").value = "Encargado";
  for (let column = 1; column <= 6; column += 1) {
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
  tasks.columns = [14, 14, 27, 30, 45, 52].map((width) => ({ width }));
  tasks.getColumn(1).numFmt = "yyyy-mm-dd";
  tasks.getCell("J1").value = "Cómo completar la plantilla";
  tasks.getCell("J2").value =
    "Una hoja por semana. Duplicá Tareas para preparar más semanas.";
  tasks.getCell("J3").value =
    "Fecha: AAAA-MM-DD o AAAA/MM/DD. Día es opcional si indicás fecha.";
  tasks.getCell("J4").value =
    "Encargado: escribí nombres separados por comas. Ejemplo: Ana Mora, Luis Solís.";
  tasks.getCell("J5").value =
    "Los nombres del catálogo se vinculan automáticamente al importar. Si hay nombres repetidos, usá el código DNA o identificá a la persona en la revisión.";
  tasks.getCell("J6").value =
    "Elegí un área del catálogo. Producto es opcional. Tarea es requerida.";
  tasks.getCell("J7").value =
    "Al importar, confirmá el lunes y domingo de cada hoja y revisá los errores.";
  tasks.getCell("J8").value =
    "Cargar no publica. Revisá el borrador y confirmá su publicación.";
  tasks.getColumn(10).width = 80;
  for (let row = 2; row <= 8; row += 1) {
    tasks.getCell(row, 10).alignment = { wrapText: true, vertical: "top" };
    tasks.getRow(row).height = 48;
  }
  tasks.getCell("J1").font = { bold: true, color: { argb: dark } };
  tasks.getColumn(6).numFmt = "@";
  for (let row = 3; row <= 152; row += 1) {
    tasks.getCell(row, 3).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [`'Áreas'!$A$2:$A$${Math.max(2, areas.length + 1)}`],
    };
    tasks.getCell(row, 2).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"Lunes,Martes,Miércoles,Jueves,Viernes,Sábado,Domingo"'],
    };
    tasks.getCell(row, 6).dataValidation = {
      type: "list",
      allowBlank: true,
      showErrorMessage: false,
      showInputMessage: true,
      promptTitle: "Una o varias personas",
      prompt:
        "Escribí varios nombres separados por comas. El menú elige una persona por vez; no acumula selecciones.",
      formulae: [`'Colaboradores'!$B$2:$B$${Math.max(2, employees.length + 1)}`],
    };
    tasks.getRow(row).alignment = { vertical: "top", wrapText: true };
  }
  tasks.autoFilter = "A2:F152";

  people.addRow(["Código", "Nombre"]);
  employees
    .slice()
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "es"))
    .forEach((employee) =>
      people.addRow([employee.employeeCode ?? "", employee.displayName]),
    );
  people.columns = [{ width: 18 }, { width: 38 }];
  people.autoFilter = `A1:B${Math.max(2, employees.length + 1)}`;
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
    autoFilter: true,
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
  sheet.autoFilter = {
    from: { column: 1, row: 2 },
    to: { column: 6, row: Math.max(152, plan.tasks.length + 2) },
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
      row.getCell(6).value = task.assigneeEmployeeIds
        .map(
          (employeeId) =>
            codeByEmployeeId.get(employeeId.toHexString()) || employeeId.toHexString(),
        )
        .join(", ");
    });
  workbook.subject = `Semana ${plan.weekStart}`;
  workbook.modified = new Date();
  return workbook.xlsx.writeBuffer();
}
