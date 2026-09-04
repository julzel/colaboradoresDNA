import "server-only";

import { createHash } from "node:crypto";

import ExcelJS from "exceljs";

import { ProductionWorkbookParseError } from "@/features/production-tasks/application/production-task-errors";
import {
  splitLegacyAssignees,
  type ProductionImportRawRow,
} from "@/features/production-tasks/domain/production-task-import";
import {
  normalizeProductionLookup,
  normalizeProductionText,
} from "@/features/production-tasks/domain/shared";

const MAX_COMPRESSED_BYTES = 8 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 80 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 2_000;
const MAX_SHEETS = 30;
const MAX_ROWS_PER_SHEET = 2_000;
const MAX_CELLS = 50_000;
const MAX_TEXT_LENGTH = 2_000;

export type ParsedProductionWorkbook = {
  hash: string;
  sheets: Array<{ name: string; rows: ProductionImportRawRow[] }>;
};

function validateZipEnvelope(buffer: Buffer) {
  if (buffer.length > MAX_COMPRESSED_BYTES) {
    throw new ProductionWorkbookParseError("file_too_large");
  }

  let entries = 0;
  let uncompressedBytes = 0;
  for (let offset = 0; offset + 46 <= buffer.length; offset += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) continue;
    entries += 1;
    const size = buffer.readUInt32LE(offset + 24);
    if (size === 0xffffffff) {
      throw new ProductionWorkbookParseError("limits_exceeded");
    }
    uncompressedBytes += size;
    const nameLength = buffer.readUInt16LE(offset + 28);
    const name = buffer
      .subarray(offset + 46, offset + 46 + nameLength)
      .toString("utf8")
      .toLocaleLowerCase("en-US");
    if (name.includes("vbaproject.bin") || name.includes("externallinks/")) {
      throw new ProductionWorkbookParseError("active_content");
    }
  }

  if (
    entries === 0 ||
    entries > MAX_ZIP_ENTRIES ||
    uncompressedBytes > MAX_UNCOMPRESSED_BYTES
  ) {
    throw new ProductionWorkbookParseError("limits_exceeded");
  }
}

function cellText(cell: ExcelJS.Cell) {
  const value = cell.value;
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "result" in value) {
    return normalizeProductionText(String(value.result ?? ""));
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return normalizeProductionText(cell.text || String(value));
}

function hasFormula(cell: ExcelJS.Cell) {
  return !!cell.value && typeof cell.value === "object" && "formula" in cell.value;
}

function findHeaders(worksheet: ExcelJS.Worksheet) {
  for (
    let rowNumber = 1;
    rowNumber <= Math.min(25, worksheet.rowCount);
    rowNumber += 1
  ) {
    const row = worksheet.getRow(rowNumber);
    const headers = new Map<string, number>();
    row.eachCell({ includeEmpty: false }, (cell, column) => {
      headers.set(normalizeProductionLookup(cellText(cell)), column);
    });
    const day = headers.get("dia");
    const area = headers.get("area de trabajo") ?? headers.get("area");
    const subject = [...headers.entries()].find(([name]) =>
      name.startsWith("producto"),
    )?.[1];
    const task = headers.get("tarea");
    const assignees = [...headers.entries()]
      .filter(([name]) => name === "encargada" || name.startsWith("encargado"))
      .map(([, column]) => column)
      .sort((a, b) => a - b);
    if (day && area && subject && task && assignees.length) {
      return { area, assignees, day, rowNumber, subject, task };
    }
  }
  return null;
}

function parseSheet(worksheet: ExcelJS.Worksheet) {
  const headers = findHeaders(worksheet);
  if (!headers) return null;
  if (worksheet.rowCount > MAX_ROWS_PER_SHEET) {
    throw new ProductionWorkbookParseError("limits_exceeded");
  }

  const rows: ProductionImportRawRow[] = [];
  let currentArea = "";
  let currentDay = "";
  for (
    let rowNumber = headers.rowNumber + 1;
    rowNumber <= worksheet.rowCount;
    rowNumber += 1
  ) {
    const row = worksheet.getRow(rowNumber);
    const day = cellText(row.getCell(headers.day));
    const area = cellText(row.getCell(headers.area));
    if (day) {
      currentDay = day;
      currentArea = "";
    }
    if (area) currentArea = area;
    const subject = cellText(row.getCell(headers.subject));
    const description = cellText(row.getCell(headers.task));
    const assigneeCells = headers.assignees.map((column) => row.getCell(column));
    const assigneeTexts = assigneeCells.flatMap((cell) =>
      splitLegacyAssignees(cellText(cell)),
    );
    const hasAnyValue = !!(subject || description || assigneeTexts.length);
    if (!hasAnyValue) continue;
    const textValues = [
      currentDay,
      currentArea,
      subject,
      description,
      ...assigneeTexts,
    ];
    if (textValues.some((value) => value.length > MAX_TEXT_LENGTH)) {
      throw new ProductionWorkbookParseError("limits_exceeded");
    }

    rows.push({
      areaText: currentArea,
      assigneeTexts,
      dayText: currentDay,
      description,
      hasFormula:
        hasFormula(row.getCell(headers.day)) ||
        hasFormula(row.getCell(headers.area)) ||
        hasFormula(row.getCell(headers.subject)) ||
        hasFormula(row.getCell(headers.task)) ||
        assigneeCells.some(hasFormula),
      rowNumber,
      subject,
    });
  }
  return {
    inspectedCellCount:
      worksheet.rowCount *
      new Set([
        headers.area,
        ...headers.assignees,
        headers.day,
        headers.subject,
        headers.task,
      ]).size,
    rows,
  };
}

export async function parseProductionWorkbook(
  buffer: Buffer,
): Promise<ParsedProductionWorkbook> {
  validateZipEnvelope(buffer);
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(
      buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
    );
  } catch {
    throw new ProductionWorkbookParseError("invalid_workbook");
  }
  if (workbook.worksheets.length > MAX_SHEETS) {
    throw new ProductionWorkbookParseError("limits_exceeded");
  }

  let cellCount = 0;
  const sheets = workbook.worksheets.flatMap((worksheet) => {
    const parsed = parseSheet(worksheet);
    if (!parsed) return [];
    cellCount += parsed.inspectedCellCount;
    return [{ name: worksheet.name, rows: parsed.rows }];
  });
  if (cellCount > MAX_CELLS) {
    throw new ProductionWorkbookParseError("limits_exceeded");
  }
  if (!sheets.length) {
    throw new ProductionWorkbookParseError("no_task_sheets");
  }

  return {
    hash: createHash("sha256").update(buffer).digest("hex"),
    sheets,
  };
}
