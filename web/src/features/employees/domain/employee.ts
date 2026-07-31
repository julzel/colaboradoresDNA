import type { ObjectId } from "mongodb";
import { z } from "zod";

import {
  isoCalendarDateSchema,
  normalizeHumanText,
  objectIdStringSchema,
} from "@/features/employees/domain/shared";

export const identificationTypeSchema = z.enum([
  "national_id",
  "residence_id",
  "other",
]);
export const employmentStatusSchema = z.enum(["active", "inactive"]);

export type IdentificationType = z.infer<typeof identificationTypeSchema>;
export type EmploymentStatus = z.infer<typeof employmentStatusSchema>;

export type EmployeeIdentification = {
  normalizedValue: string;
  type: IdentificationType;
  value: string;
};

export type EmployeePhoneNumber = {
  displayValue: string;
  normalizedValue: string;
};

export type EmployeeDocument = {
  _id: ObjectId;
  birthDay: number;
  birthMonth: number;
  createdAt: Date;
  employmentEndedOn: string | null;
  employmentStartedOn: string;
  employmentStatus: EmploymentStatus;
  firstSurname: string;
  givenNames: string;
  identification: EmployeeIdentification;
  phoneNumber: EmployeePhoneNumber | null;
  platformUserId: ObjectId;
  preferredName: string | null;
  secondSurname: string | null;
  shareBirthdayOnCalendar: boolean;
  updatedAt: Date;
};

export type Employee = Omit<EmployeeDocument, "_id" | "platformUserId"> & {
  id: string;
  platformUserId: string;
};

export const birthdayMonthOptions = [
  { label: "Enero", value: 1 },
  { label: "Febrero", value: 2 },
  { label: "Marzo", value: 3 },
  { label: "Abril", value: 4 },
  { label: "Mayo", value: 5 },
  { label: "Junio", value: 6 },
  { label: "Julio", value: 7 },
  { label: "Agosto", value: 8 },
  { label: "Setiembre", value: 9 },
  { label: "Octubre", value: 10 },
  { label: "Noviembre", value: 11 },
  { label: "Diciembre", value: 12 },
] as const;

const requiredNameSchema = z
  .string()
  .transform(normalizeHumanText)
  .pipe(z.string().min(1, "Este campo es requerido.").max(120));

const optionalNameSchema = z
  .string()
  .nullable()
  .optional()
  .transform((value) => {
    if (value === null || value === undefined) {
      return null;
    }

    const normalized = normalizeHumanText(value);
    return normalized.length > 0 ? normalized : null;
  })
  .pipe(z.string().max(120).nullable());

const birthdaySchema = z
  .object({
    birthDay: z.coerce.number().int().min(1).max(31),
    birthMonth: z.coerce.number().int().min(1).max(12),
  })
  .refine(
    ({ birthDay, birthMonth }) => {
      const date = new Date(Date.UTC(2000, birthMonth - 1, birthDay));

      return date.getUTCMonth() === birthMonth - 1 && date.getUTCDate() === birthDay;
    },
    {
      message: "El día no corresponde al mes seleccionado.",
      path: ["birthDay"],
    },
  );

export const identificationInputSchema = z
  .object({
    type: identificationTypeSchema,
    value: z.string().max(120),
  })
  .transform((identification, context): EmployeeIdentification => {
    const displayValue = normalizeHumanText(identification.value);

    if (identification.type === "national_id") {
      const acceptedDisplay = /^(?:[1-9]\d{8}|[1-9]-\d{4}-\d{4})$/.test(displayValue);
      const normalizedValue = displayValue.replaceAll("-", "");

      if (!acceptedDisplay || !/^[1-9]\d{8}$/.test(normalizedValue)) {
        context.addIssue({
          code: "custom",
          message: "Ingresá una cédula en formato X-XXXX-XXXX.",
        });

        return z.NEVER;
      }

      return {
        normalizedValue,
        type: identification.type,
        value: formatNationalId(normalizedValue),
      };
    }

    if (identification.type === "residence_id") {
      const acceptedDisplay = /^[\d\s]+$/.test(displayValue);
      const normalizedValue = displayValue.replace(/\s/g, "");

      if (!acceptedDisplay || !/^[1-9]\d{10,11}$/.test(normalizedValue)) {
        context.addIssue({
          code: "custom",
          message: "Ingresá un DIMEX de 11 o 12 dígitos.",
        });

        return z.NEVER;
      }

      return {
        normalizedValue,
        type: identification.type,
        value: normalizedValue,
      };
    }

    if (displayValue.length === 0) {
      context.addIssue({
        code: "custom",
        message: "Ingresá una identificación.",
      });

      return z.NEVER;
    }

    return {
      normalizedValue: displayValue.normalize("NFKC").toLocaleUpperCase("es-CR"),
      type: identification.type,
      value: displayValue,
    };
  });

export const phoneNumberInputSchema = z
  .string()
  .nullable()
  .optional()
  .transform((value, context): EmployeePhoneNumber | null => {
    if (value === null || value === undefined || value.trim().length === 0) {
      return null;
    }

    const displayValue = normalizeHumanText(value);
    const startsWithCountryCode = displayValue.startsWith("+");
    const allowedPresentation = /^\+?[\d\s().-]+$/.test(displayValue);
    const digits = displayValue.replace(/\D/g, "");
    const normalizedValue =
      !startsWithCountryCode && digits.length === 8 ? `+506${digits}` : `+${digits}`;

    if (
      !allowedPresentation ||
      (!startsWithCountryCode && digits.length !== 8) ||
      !/^\+[1-9]\d{7,14}$/.test(normalizedValue)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Ingresá un número de Costa Rica de 8 dígitos o incluí el código de país.",
      });

      return z.NEVER;
    }

    return { displayValue, normalizedValue };
  });

export const preferredNameInputSchema = z
  .string()
  .nullable()
  .optional()
  .transform((value) => {
    if (value === null || value === undefined) return null;
    const normalized = normalizeHumanText(value).normalize("NFC");
    return normalized.length ? normalized : null;
  })
  .pipe(
    z
      .string()
      .min(1)
      .max(60, "El nombre preferido no puede superar 60 caracteres.")
      .regex(
        /^[^\p{Cc}\p{Cf}]+$/u,
        "El nombre preferido contiene caracteres no permitidos.",
      )
      .nullable(),
  );

export const employeeSelfServiceProfileInputSchema = z
  .object({
    phoneNumber: phoneNumberInputSchema,
    preferredName: preferredNameInputSchema,
    shareBirthdayOnCalendar: z.boolean(),
  })
  .strict();

export const employeeInputSchema = z
  .object({
    birthDay: birthdaySchema.shape.birthDay,
    birthMonth: birthdaySchema.shape.birthMonth,
    employmentEndedOn: isoCalendarDateSchema.nullish().default(null),
    employmentStartedOn: isoCalendarDateSchema,
    employmentStatus: employmentStatusSchema.default("active"),
    firstSurname: requiredNameSchema,
    givenNames: requiredNameSchema,
    identification: identificationInputSchema,
    phoneNumber: phoneNumberInputSchema,
    platformUserId: objectIdStringSchema,
    secondSurname: optionalNameSchema,
    shareBirthdayOnCalendar: z.boolean().default(true),
  })
  .superRefine((employee, context) => {
    const birthdayResult = birthdaySchema.safeParse(employee);

    if (!birthdayResult.success) {
      context.addIssue({
        code: "custom",
        message: "El día no corresponde al mes seleccionado.",
        path: ["birthDay"],
      });
    }

    if (employee.employmentStatus === "inactive" && !employee.employmentEndedOn) {
      context.addIssue({
        code: "custom",
        message: "La fecha de salida es requerida para un colaborador inactivo.",
        path: ["employmentEndedOn"],
      });
    }

    if (employee.employmentStatus === "active" && employee.employmentEndedOn) {
      context.addIssue({
        code: "custom",
        message: "Un colaborador activo no puede tener fecha de salida.",
        path: ["employmentEndedOn"],
      });
    }

    if (
      employee.employmentEndedOn &&
      employee.employmentEndedOn < employee.employmentStartedOn
    ) {
      context.addIssue({
        code: "custom",
        message: "La fecha de salida no puede ser anterior a la fecha de ingreso.",
        path: ["employmentEndedOn"],
      });
    }
  });

export type EmployeeInput = z.input<typeof employeeInputSchema>;
export type NormalizedEmployeeInput = z.output<typeof employeeInputSchema>;
export type EmployeeSelfServiceProfileInput = z.input<
  typeof employeeSelfServiceProfileInputSchema
>;

export function formatNationalId(normalizedValue: string) {
  return `${normalizedValue.slice(0, 1)}-${normalizedValue.slice(1, 5)}-${normalizedValue.slice(5, 9)}`;
}

export function formatEmployeeDisplayName(
  employee: Pick<EmployeeDocument, "firstSurname" | "givenNames" | "secondSurname">,
) {
  return [employee.givenNames, employee.firstSurname, employee.secondSurname]
    .filter(Boolean)
    .join(" ");
}

export function formatEmployeePreferredDisplayName(
  employee: Pick<
    EmployeeDocument,
    "firstSurname" | "givenNames" | "preferredName" | "secondSurname"
  >,
) {
  return employee.preferredName?.trim() || formatEmployeeDisplayName(employee);
}

export function getDisplayNameInitials(displayName: string) {
  const parts = normalizeHumanText(displayName).split(" ").filter(Boolean);
  const first = parts[0] ?? "";
  const last = parts.length > 1 ? (parts.at(-1) ?? "") : "";

  return `${first.charAt(0)}${last.charAt(0)}`.toLocaleUpperCase("es-CR").slice(0, 2);
}

export function formatEmployeeBirthday(
  employee: Pick<EmployeeDocument, "birthDay" | "birthMonth">,
) {
  return `${String(employee.birthDay).padStart(2, "0")}/${String(
    employee.birthMonth,
  ).padStart(2, "0")}`;
}

export function getEmployeeInitials(
  employee: Pick<EmployeeDocument, "firstSurname" | "givenNames">,
) {
  const firstGivenName = employee.givenNames.split(" ")[0] ?? "";
  return `${firstGivenName.charAt(0)}${employee.firstSurname.charAt(0)}`
    .toLocaleUpperCase("es-CR")
    .slice(0, 2);
}

export function maskIdentification(identification: EmployeeIdentification) {
  const visibleSuffix = identification.normalizedValue.slice(-4);
  return `••••${visibleSuffix}`;
}

export function toEmployee(document: EmployeeDocument): Employee {
  const { _id, platformUserId, ...employee } = document;

  return {
    ...employee,
    id: _id.toHexString(),
    platformUserId: platformUserId.toHexString(),
    preferredName: employee.preferredName ?? null,
  };
}
