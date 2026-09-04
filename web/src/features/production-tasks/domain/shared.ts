import { z } from "zod";

export const COSTA_RICA_TIMEZONE = "America/Costa_Rica" as const;

export const productionObjectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "El identificador no es válido.");

export const productionDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ingresá una fecha válida.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }, "Ingresá una fecha válida.");

export const productionWeekStartSchema = productionDateSchema.refine(
  (value) => new Date(`${value}T00:00:00.000Z`).getUTCDay() === 1,
  "La fecha debe ser un lunes.",
);

export function normalizeProductionText(value: string) {
  return value.trim().replace(/\s+/g, " ").normalize("NFC");
}

export function normalizeProductionLookup(value: string) {
  return normalizeProductionText(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-CR");
}

export function getCostaRicaDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: COSTA_RICA_TIMEZONE,
    year: "numeric",
  }).format(now);
}

export function getMondayForDate(value: string) {
  const parsed = productionDateSchema.parse(value);
  const date = new Date(`${parsed}T00:00:00.000Z`);
  const distance = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - distance);
  return date.toISOString().slice(0, 10);
}

export function addCalendarDays(value: string, days: number) {
  const parsed = productionDateSchema.parse(value);
  const date = new Date(`${parsed}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export const productionTaskErrorCodes = [
  "active_employee_required",
  "area_not_found",
  "area_exists",
  "draft_conflict",
  "draft_not_found",
  "forbidden",
  "import_expired",
  "import_invalid",
  "plan_not_found",
  "publication_invalid",
  "stale_version",
  "task_not_found",
  "template_not_found",
  "undo_window_closed",
  "warnings_unacknowledged",
] as const;

export type ProductionTaskErrorCode = (typeof productionTaskErrorCodes)[number];

export class ProductionTaskDomainError extends Error {
  constructor(public readonly code: ProductionTaskErrorCode) {
    super(code);
    this.name = "ProductionTaskDomainError";
  }
}
