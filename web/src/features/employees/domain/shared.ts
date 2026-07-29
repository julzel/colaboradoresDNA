import { z } from "zod";

export const objectIdStringSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "El identificador no es válido.");

export const isoCalendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Usá una fecha en formato AAAA-MM-DD.")
  .refine(isValidIsoCalendarDate, "La fecha no es válida.");

export function isValidIsoCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function normalizeHumanText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeSearchText(value: string) {
  return normalizeHumanText(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-CR");
}

export function previousIsoCalendarDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function dateRangesOverlap(
  first: { effectiveFrom: string; effectiveTo: string | null },
  second: { effectiveFrom: string; effectiveTo: string | null },
) {
  return (
    (first.effectiveTo === null || second.effectiveFrom <= first.effectiveTo) &&
    (second.effectiveTo === null || first.effectiveFrom <= second.effectiveTo)
  );
}
