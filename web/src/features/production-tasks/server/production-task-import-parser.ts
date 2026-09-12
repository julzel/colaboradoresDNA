import "server-only";

import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";

import ExcelJS from "exceljs";
import { parseProductionCsv } from "./production-task-csv";

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

  // Walk the actual central directory, never signatures occurring inside data.
  let end = -1;
  for (
    let offset = buffer.length - 22;
    offset >= Math.max(0, buffer.length - 65_557);
    offset--
  ) {
    if (
      buffer.readUInt32LE(offset) === 0x06054b50 &&
      offset + 22 + buffer.readUInt16LE(offset + 20) === buffer.length
    ) {
      end = offset;
      break;
    }
  }
  if (end < 0) throw new ProductionWorkbookParseError("limits_exceeded");
  const entries = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16);
  const directoryEnd = offset + buffer.readUInt32LE(end + 12);
  if (
    !entries ||
    entries > MAX_ZIP_ENTRIES ||
    buffer.readUInt16LE(end + 4) !== 0 ||
    buffer.readUInt16LE(end + 6) !== 0 ||
    buffer.readUInt16LE(end + 8) !== entries ||
    directoryEnd !== end
  ) {
    throw new ProductionWorkbookParseError("limits_exceeded");
  }
  let uncompressedBytes = 0;
  for (let entry = 0; entry < entries; entry++) {
    if (offset + 46 > directoryEnd || buffer.readUInt32LE(offset) !== 0x02014b50)
      throw new ProductionWorkbookParseError("invalid_workbook");
    const size = buffer.readUInt32LE(offset + 24);
    if (size === 0xffffffff) {
      throw new ProductionWorkbookParseError("limits_exceeded");
    }
    uncompressedBytes += size;
    const nameLength = buffer.readUInt16LE(offset + 28);
    const nextOffset =
      offset +
      46 +
      nameLength +
      buffer.readUInt16LE(offset + 30) +
      buffer.readUInt16LE(offset + 32);
    if (nextOffset > directoryEnd || (buffer.readUInt16LE(offset + 8) & 1) !== 0)
      throw new ProductionWorkbookParseError("invalid_workbook");
    const name = buffer
      .subarray(offset + 46, offset + 46 + nameLength)
      .toString("utf8")
      .replaceAll("\\", "/")
      .toLocaleLowerCase("en-US");
    if (name.includes("vbaproject.bin") || name.includes("externallinks/")) {
      throw new ProductionWorkbookParseError("active_content");
    }
    if (uncompressedBytes > MAX_UNCOMPRESSED_BYTES || entries > MAX_ZIP_ENTRIES) {
      throw new ProductionWorkbookParseError("limits_exceeded");
    }
    // Do not trust declared expanded sizes: bound each real inflation before ExcelJS.
    const local = buffer.readUInt32LE(offset + 42);
    if (local + 30 > buffer.length || buffer.readUInt32LE(local) !== 0x04034b50) {
      throw new ProductionWorkbookParseError("invalid_workbook");
    }
    const start =
      local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const method = buffer.readUInt16LE(offset + 10);
    if (start + compressedSize > buffer.length || (method !== 0 && method !== 8)) {
      throw new ProductionWorkbookParseError("invalid_workbook");
    }
    try {
      const content = buffer.subarray(start, start + compressedSize);
      const expanded =
        method === 8
          ? inflateRawSync(content, { maxOutputLength: Math.max(1, size) })
          : content;
      if (expanded.length !== size) throw new Error("size");
    } catch {
      throw new ProductionWorkbookParseError("limits_exceeded");
    }
    offset = nextOffset;
  }

  if (
    entries === 0 ||
    entries > MAX_ZIP_ENTRIES ||
    uncompressedBytes > MAX_UNCOMPRESSED_BYTES ||
    offset !== directoryEnd
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
    const date = headers.get("fecha");
    const area = headers.get("area de trabajo") ?? headers.get("area");
    const subject = [...headers.entries()].find(([name]) =>
      name.startsWith("producto"),
    )?.[1];
    const task = headers.get("tarea");
    const assignees = [...headers.entries()]
      .filter(([name]) => name === "encargada" || name.startsWith("encargado"))
      .map(([, column]) => column)
      .sort((a, b) => a - b);
    if ((day || date) && area && subject && task && assignees.length) {
      return { area, assignees, day, date, rowNumber, subject, task };
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
    const day = headers.day ? cellText(row.getCell(headers.day)) : "";
    const dateText = headers.date ? cellText(row.getCell(headers.date)) : "";
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
      dateText,
      currentDay,
      currentArea,
      subject,
      description,
      ...assigneeTexts,
    ];
    if (
      textValues.some((value) => value.length > MAX_TEXT_LENGTH) ||
      assigneeTexts.length > 30
    ) {
      throw new ProductionWorkbookParseError("limits_exceeded");
    }

    rows.push({
      dateText,
      areaText: currentArea,
      assigneeTexts,
      dayText: dateText ? day : currentDay,
      description,
      hasFormula:
        (headers.day ? hasFormula(row.getCell(headers.day)) : false) ||
        (headers.date ? hasFormula(row.getCell(headers.date)) : false) ||
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
        headers.date,
        headers.subject,
        headers.task,
      ]).size,
    rows,
  };
}

export async function parseProductionWorkbook(
  buffer: Buffer,
  fileName = "tareas.xlsx",
): Promise<ParsedProductionWorkbook> {
  if (buffer.length > MAX_COMPRESSED_BYTES)
    throw new ProductionWorkbookParseError("file_too_large");
  const workbook = new ExcelJS.Workbook();
  if (fileName.toLowerCase().endsWith(".csv")) {
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
      throw new ProductionWorkbookParseError("invalid_workbook");
    }
    workbook.addWorksheet("Tareas").addRows(parseProductionCsv(text));
  } else if (fileName.toLowerCase().endsWith(".xlsx")) {
    validateZipEnvelope(buffer);
    try {
      await workbook.xlsx.load(
        buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
      );
    } catch {
      throw new ProductionWorkbookParseError("invalid_workbook");
    }
  } else throw new ProductionWorkbookParseError("invalid_workbook");
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
