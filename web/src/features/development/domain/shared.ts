import { z } from "zod";

export const developmentObjectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "El identificador no es válido.");

export const developmentIsoDateSchema = z.iso.date({
  error: "Ingresá una fecha válida.",
});

const forbiddenNarrativeControlCharacters =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u;

export function normalizeDevelopmentText(value: string) {
  return value
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export function developmentSingleLineTextSchema({
  max,
  min = 1,
}: {
  max: number;
  min?: number;
}) {
  return z
    .string()
    .transform((value) => value.normalize("NFC").trim().replace(/\s+/g, " "))
    .pipe(
      z
        .string()
        .min(min, "Este campo es requerido.")
        .max(max, `Este campo no puede superar ${max} caracteres.`)
        .refine(
          (value) => !forbiddenNarrativeControlCharacters.test(value),
          "El texto contiene caracteres no permitidos.",
        ),
    );
}

export function developmentNarrativeTextSchema({
  max,
  min = 1,
}: {
  max: number;
  min?: number;
}) {
  return z
    .string()
    .transform(normalizeDevelopmentText)
    .pipe(
      z
        .string()
        .min(min, "Este campo es requerido.")
        .max(max, `Este campo no puede superar ${max} caracteres.`)
        .refine(
          (value) => !forbiddenNarrativeControlCharacters.test(value),
          "El texto contiene caracteres no permitidos.",
        ),
    );
}

export function optionalDevelopmentNarrativeTextSchema(max: number) {
  return z
    .string()
    .nullish()
    .transform((value) => {
      if (value === null || value === undefined) return null;
      const normalized = normalizeDevelopmentText(value);
      return normalized.length > 0 ? normalized : null;
    })
    .pipe(
      z
        .string()
        .max(max, `Este campo no puede superar ${max} caracteres.`)
        .refine(
          (value) => !forbiddenNarrativeControlCharacters.test(value),
          "El texto contiene caracteres no permitidos.",
        )
        .nullable(),
    );
}

export const developmentVersionSchema = z.number().int().min(1);

export type DevelopmentEncryptedPayload = {
  algorithm: "aes-256-gcm";
  authTag: string;
  ciphertext: string;
  iv: string;
  keyVersion: string;
};

export class DevelopmentDomainError extends Error {
  constructor(
    public readonly code:
      | "conflict"
      | "employee_not_found"
      | "forbidden"
      | "invalid_transition"
      | "record_not_found",
  ) {
    super(code);
    this.name = "DevelopmentDomainError";
  }
}
