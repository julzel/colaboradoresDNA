import type { ObjectId } from "mongodb";
import { z } from "zod";

import {
  getMondayForDate,
  productionDateSchema,
  productionObjectIdSchema,
  productionWeekStartSchema,
} from "@/features/production-tasks/domain/shared";

export type ProductionImportRawRow = {
  areaText: string;
  assigneeTexts: string[];
  dayText: string;
  description: string;
  hasFormula: boolean;
  rowNumber: number;
  subject: string;
};

export type ProductionImportRowDocument = ProductionImportRawRow & {
  areaId: ObjectId | null;
  assigneeEmployeeIds: ObjectId[];
  key: string;
};

export type ProductionImportSheetDocument = {
  mode: "merge" | "replace";
  name: string;
  rows: ProductionImportRowDocument[];
  selected: boolean;
  weekStart: string | null;
};

export type ProductionImportPreviewDocument = {
  _id: ObjectId;
  actorPlatformUserId: ObjectId;
  committedAt: Date | null;
  createdAt: Date;
  expiresAt: Date;
  originalFileName: string;
  sheets: ProductionImportSheetDocument[];
  status: "preview" | "committed";
  version: number;
  workbookHash: string;
};

export const productionImportConfigurationSchema = z.object({
  expectedVersion: z.coerce.number().int().min(1),
  previewId: productionObjectIdSchema,
  rows: z.array(
    z.object({
      areaId: productionObjectIdSchema.nullable(),
      assigneeEmployeeIds: z.array(productionObjectIdSchema).max(30),
      key: z.string().min(1).max(200),
    }),
  ),
  sheets: z.array(
    z.object({
      mode: z.enum(["merge", "replace"]),
      name: z.string().min(1).max(120),
      selected: z.boolean(),
      weekStart: productionWeekStartSchema.nullable(),
    }),
  ),
});

export type ProductionImportConfiguration = z.infer<
  typeof productionImportConfigurationSchema
>;

const monthByName: Record<string, number> = {
  abril: 4,
  agosto: 8,
  diciembre: 12,
  enero: 1,
  febrero: 2,
  julio: 7,
  junio: 6,
  marzo: 3,
  mayo: 5,
  noviembre: 11,
  octubre: 10,
  septiembre: 9,
  setiembre: 9,
};

export function inferWeekStartFromSheetName(name: string, year: number) {
  const normalized = name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-CR");
  const monthNames = Object.keys(monthByName).join("|");
  const dateMatch = new RegExp(
    `\\b([1-9]|[12]\\d|3[01])(?:\\s*-\\s*(?:[1-9]|[12]\\d|3[01]))?\\s+(?:de\\s+)?(${monthNames})\\b`,
  ).exec(normalized);
  if (!dateMatch) return null;
  const day = Number(dateMatch[1]);
  const month = monthByName[dateMatch[2]!]!;
  const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return productionDateSchema.safeParse(date).success ? getMondayForDate(date) : null;
}

export function splitLegacyAssignees(value: string) {
  return value
    .split(/\s*(?:,|\by\b)\s*/iu)
    .map((part) => part.trim())
    .filter(Boolean);
}
