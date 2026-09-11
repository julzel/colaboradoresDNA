import "server-only";

import { ObjectId } from "mongodb";

import { requireProductionTaskManager } from "./production-task-authorization";
import { productionTaskEmployeeAdapter } from "@/features/employees/integrations/production-task-employee-adapter";
import { createProductionImportPreviewResult } from "@/features/production-tasks/application/production-task-import-query";
import {
  inferWeekStartFromSheetName,
  productionImportConfigurationSchema,
  productionImportCommitSchema,
  type ProductionImportPreviewDocument,
} from "@/features/production-tasks/domain/production-task-import";
import {
  ProductionTaskDomainError,
  normalizeProductionLookup,
} from "@/features/production-tasks/domain/shared";
import {
  createImportPreview,
  findImportPreviewForActor,
  updateImportPreviewConfiguration,
} from "@/features/production-tasks/server/production-task-import-repository";
import { parseProductionWorkbook } from "@/features/production-tasks/server/production-task-import-parser";
import { observeProductionOperation } from "@/features/production-tasks/server/production-task-observability";
import {
  commitProductionImportDrafts,
  listProductionAreas,
  getProductionImportTargets,
  type PreparedProductionTaskInput,
} from "@/features/production-tasks/server/production-task-repository";

async function requireImportManager() {
  return requireProductionTaskManager();
}

async function resolvePreview(preview: ProductionImportPreviewDocument) {
  const [areas, employees] = await Promise.all([
    listProductionAreas(),
    productionTaskEmployeeAdapter.listActiveEmployees(),
  ]);
  const result = createProductionImportPreviewResult({ areas, employees, preview });
  result.targets = await getProductionImportTargets(
    result.sheets
      .filter((sheet) => sheet.selected && sheet.weekStart)
      .map((sheet) => sheet.weekStart!),
  );
  return result;
}

export async function createProductionImportPreview({
  buffer,
  fileName,
  year,
}: {
  buffer: Buffer;
  fileName: string;
  year: number;
}) {
  const { platformUser } = await requireImportManager();
  const parsed = await observeProductionOperation("import_preview", () =>
    parseProductionWorkbook(buffer, fileName),
  );
  const [areas, employees] = await Promise.all([
    listProductionAreas(),
    productionTaskEmployeeAdapter.listActiveEmployees(),
  ]);
  const areaByName = new Map(
    areas.map((area) => [normalizeProductionLookup(area.name), area]),
  );
  const employeeByCode = new Map(
    employees.flatMap((employee) =>
      employee.employeeCode
        ? [[employee.employeeCode.toUpperCase(), employee] as const]
        : [],
    ),
  );
  const preview = await createImportPreview({
    actorPlatformUserId: new ObjectId(platformUser.id),
    committedAt: null,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    originalFileName: fileName.slice(0, 180),
    sheets: parsed.sheets.map((sheet, sheetIndex) => ({
      mode: "merge",
      name: sheet.name,
      rows: sheet.rows.map((row) => ({
        ...row,
        areaId: areaByName.get(normalizeProductionLookup(row.areaText))?._id ?? null,
        // Never partially map a shared assignment or infer identity from a name.
        assigneeEmployeeIds: row.assigneeTexts.every((value) =>
          employeeByCode.has(value.toUpperCase()),
        )
          ? [
              ...new Set(
                row.assigneeTexts.map(
                  (value) => employeeByCode.get(value.toUpperCase())!.employeeId,
                ),
              ),
            ].map((id) => new ObjectId(id))
          : [],
        key: `${sheetIndex}:${row.rowNumber}`,
      })),
      selected: normalizeProductionLookup(sheet.name) !== "original",
      weekStart: inferWeekStartFromSheetName(sheet.name, year),
    })),
    status: "preview",
    version: 1,
    workbookHash: parsed.hash,
  });
  return resolvePreview(preview);
}

export async function getProductionImportPreview(previewId: string) {
  const { platformUser } = await requireImportManager();
  const preview = await findImportPreviewForActor({
    actorPlatformUserId: platformUser.id,
    previewId,
  });
  return preview ? resolvePreview(preview) : null;
}

export async function configureProductionImport(input: unknown) {
  const { platformUser } = await requireImportManager();
  const parsed = productionImportConfigurationSchema.parse(input);
  const preview = await findImportPreviewForActor({
    actorPlatformUserId: platformUser.id,
    previewId: parsed.previewId,
  });
  if (!preview || preview.status !== "preview") {
    throw new ProductionTaskDomainError("import_expired");
  }
  const sheetByName = new Map(parsed.sheets.map((sheet) => [sheet.name, sheet]));
  const rowByKey = new Map(parsed.rows.map((row) => [row.key, row]));
  const sheets = preview.sheets.map((sheet) => {
    const sheetConfig = sheetByName.get(sheet.name);
    if (!sheetConfig) throw new ProductionTaskDomainError("import_invalid");
    return {
      ...sheet,
      mode: sheetConfig.mode,
      selected: sheetConfig.selected,
      weekStart: sheetConfig.weekStart,
      rows: sheet.rows.map((row) => {
        const config = rowByKey.get(row.key);
        if (!config) throw new ProductionTaskDomainError("import_invalid");
        return {
          ...row,
          areaId: config.areaId ? new ObjectId(config.areaId) : null,
          assigneeEmployeeIds: config.assigneeEmployeeIds.map((id) => new ObjectId(id)),
        };
      }),
    };
  });
  const updated = await updateImportPreviewConfiguration({
    actorPlatformUserId: platformUser.id,
    expectedVersion: parsed.expectedVersion,
    previewId: parsed.previewId,
    sheets,
  });
  return resolvePreview(updated);
}

export async function commitProductionImport(input: unknown) {
  const { platformUser } = await requireImportManager();
  const { previewId, expectedVersion, targets, overrideConfirmed } =
    productionImportCommitSchema.parse(input);
  const preview = await findImportPreviewForActor({
    actorPlatformUserId: platformUser.id,
    previewId,
  });
  if (!preview || preview.status !== "preview") {
    throw new ProductionTaskDomainError("import_expired");
  }
  if (preview.version !== expectedVersion)
    throw new ProductionTaskDomainError("stale_version");
  const view = await resolvePreview(preview);
  if (!view.canCommit) throw new ProductionTaskDomainError("import_invalid");
  const areas = await listProductionAreas();
  const areaById = new Map(areas.map((area) => [area._id.toHexString(), area.name]));
  const selectedSheets = view.sheets.filter((item) => item.selected);
  if (selectedSheets.some((sheet) => sheet.validCount > 500)) {
    throw new ProductionTaskDomainError("import_invalid");
  }
  const targetWeeks = selectedSheets.map((sheet) => sheet.weekStart!);
  if (new Set(targetWeeks).size !== targetWeeks.length) {
    throw new ProductionTaskDomainError("import_invalid");
  }
  if (
    targets.length !== targetWeeks.length ||
    new Set(targets.map((target) => target.weekStart)).size !== targetWeeks.length ||
    targets.some((target) => !targetWeeks.includes(target.weekStart))
  ) {
    throw new ProductionTaskDomainError("import_invalid");
  }
  if (
    !overrideConfirmed &&
    targets.some((target) => target.draft || target.published)
  ) {
    throw new ProductionTaskDomainError("draft_conflict");
  }
  const sheets = selectedSheets.map((sheet) => {
    const tasks: PreparedProductionTaskInput[] = sheet.rows
      .filter((row) => row.status === "valid")
      .map((row, index) => ({
        areaId: row.areaId!,
        areaLabelSnapshot: areaById.get(row.areaId!)!,
        assigneeEmployeeIds: row.assigneeEmployeeIds,
        description: row.description,
        sortOrder: index,
        source: {
          importId: preview._id,
          rowNumber: row.rowNumber,
          sheetName: sheet.name,
        },
        subject: row.subject || null,
        workDate: row.workDate!,
      }));
    return { mode: sheet.mode, tasks, weekStart: sheet.weekStart! };
  });

  return observeProductionOperation(
    "import_commit",
    () =>
      commitProductionImportDrafts({
        actorPlatformUserId: platformUser.id,
        expectedPreviewVersion: preview.version,
        previewId,
        sheets,
        expectedTargets: targets,
        workbookHash: preview.workbookHash,
      }),
    sheets.reduce((total, sheet) => total + sheet.tasks.length, 0),
  );
}
