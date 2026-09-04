import type { ProductionImportPreviewDocument } from "@/features/production-tasks/domain/production-task-import";
import type { ProductionAreaDocument } from "@/features/production-tasks/domain/production-task";
import {
  addCalendarDays,
  normalizeProductionLookup,
} from "@/features/production-tasks/domain/shared";
import type { ProductionTaskEmployee } from "@/features/production-tasks/integrations/production-task-employee-port";
import type {
  ProductionImportPreviewResult,
  ProductionImportIssueCode,
} from "@/features/production-tasks/application/production-task-contracts";
import {
  toProductionTaskAreaDto,
  toProductionTaskEmployeeDto,
} from "@/features/production-tasks/application/production-task-queries";

const dayOffsets: Record<string, number> = {
  domingo: 6,
  jueves: 3,
  lunes: 0,
  martes: 1,
  miercoles: 2,
  sabado: 5,
  viernes: 4,
};

function resolveDayOffset(value: string) {
  const normalized = normalizeProductionLookup(value);
  const match = Object.entries(dayOffsets).find(([day]) => normalized.includes(day));
  return match?.[1] ?? null;
}

export function createProductionImportPreviewResult({
  areas,
  employees,
  preview,
}: {
  areas: ProductionAreaDocument[];
  employees: ProductionTaskEmployee[];
  preview: ProductionImportPreviewDocument;
}): ProductionImportPreviewResult {
  const activeAreaIds = new Set(areas.map((area) => area._id.toHexString()));
  const activeEmployeeIds = new Set(employees.map((employee) => employee.employeeId));

  const sheets = preview.sheets.map((sheet) => {
    const seen = new Set<string>();
    const rows = sheet.rows.map((row) => {
      const issues: Array<{
        code: ProductionImportIssueCode;
        tone: "error" | "warning";
      }> = [];
      const areaId = row.areaId?.toHexString() ?? null;
      const assigneeEmployeeIds = row.assigneeEmployeeIds
        .map(String)
        .filter((id) => activeEmployeeIds.has(id));
      const isTemplateCandidate = !row.description && row.assigneeTexts.length === 0;

      if (isTemplateCandidate) {
        return {
          areaId,
          areaText: row.areaText,
          assigneeEmployeeIds,
          assigneeTexts: row.assigneeTexts,
          dayText: row.dayText,
          description: row.description,
          issues,
          key: row.key,
          rowNumber: row.rowNumber,
          status: "skipped" as const,
          subject: row.subject,
          workDate: null,
        };
      }

      const dayOffset = resolveDayOffset(row.dayText);
      const workDate =
        sheet.weekStart && dayOffset !== null
          ? addCalendarDays(sheet.weekStart, dayOffset)
          : null;
      if (!sheet.weekStart) issues.push({ code: "week_missing", tone: "error" });
      else if (dayOffset === null) issues.push({ code: "day_unknown", tone: "error" });
      if (!areaId || !activeAreaIds.has(areaId)) {
        issues.push({ code: "area_unknown", tone: "error" });
      }
      if (!row.description) issues.push({ code: "task_missing", tone: "error" });
      if (row.description.length > 500) {
        issues.push({ code: "task_too_long", tone: "error" });
      }
      if (row.subject.length > 240) {
        issues.push({ code: "subject_too_long", tone: "error" });
      }
      if (assigneeEmployeeIds.length === 0) {
        issues.push({
          code: row.assigneeTexts.length ? "assignee_unknown" : "assignee_missing",
          tone: "error",
        });
      }
      if (row.hasFormula) issues.push({ code: "formula_ignored", tone: "warning" });

      const duplicateKey = [
        workDate,
        areaId,
        normalizeProductionLookup(row.subject),
        normalizeProductionLookup(row.description),
        [...assigneeEmployeeIds].sort().join(","),
      ].join("|");
      if (workDate && seen.has(duplicateKey)) {
        issues.push({ code: "duplicate", tone: "error" });
      }
      if (workDate) seen.add(duplicateKey);

      return {
        areaId,
        areaText: row.areaText,
        assigneeEmployeeIds,
        assigneeTexts: row.assigneeTexts,
        dayText: row.dayText,
        description: row.description,
        issues,
        key: row.key,
        rowNumber: row.rowNumber,
        status: issues.some((issue) => issue.tone === "error")
          ? ("error" as const)
          : ("valid" as const),
        subject: row.subject,
        workDate,
      };
    });

    return {
      errorCount: rows.filter((row) => row.status === "error").length,
      mode: sheet.mode,
      name: sheet.name,
      rows,
      selected: sheet.selected,
      validCount: rows.filter((row) => row.status === "valid").length,
      warningCount: rows.reduce(
        (total, row) =>
          total + row.issues.filter((issue) => issue.tone === "warning").length,
        0,
      ),
      weekStart: sheet.weekStart,
    };
  });
  const selected = sheets.filter((sheet) => sheet.selected);

  return {
    areas: areas.map(toProductionTaskAreaDto),
    canCommit:
      selected.length > 0 &&
      selected.every(
        (sheet) => !!sheet.weekStart && sheet.errorCount === 0 && sheet.validCount > 0,
      ),
    employees: employees.map(toProductionTaskEmployeeDto),
    expiresAt: preview.expiresAt.toISOString(),
    fileName: preview.originalFileName,
    id: preview._id.toHexString(),
    sheets,
    version: preview.version,
  };
}
