import type { ObjectId } from "mongodb";
import { z } from "zod";

import {
  isoCalendarDateSchema,
  normalizeHumanText,
  objectIdStringSchema,
} from "@/features/employees/domain/shared";

export const ptoCategorySchema = z.enum(["vacation", "sick", "personal", "other"]);
export const ptoStatusSchema = z.enum([
  "draft",
  "pending",
  "approved",
  "denied",
  "cancelled",
]);

export type PtoCategory = z.infer<typeof ptoCategorySchema>;
export type PtoStatus = z.infer<typeof ptoStatusSchema>;

export const ptoCategoryLabels: Record<PtoCategory, string> = {
  vacation: "Vacaciones",
  sick: "Enfermedad",
  personal: "Permiso personal",
  other: "Otro",
};

export const ptoStatusLabels: Record<PtoStatus, string> = {
  approved: "Aprobada",
  cancelled: "Cancelada",
  denied: "Denegada",
  draft: "Borrador",
  pending: "Pendiente",
};

// The MVP has one generic absence balance. Keep this decision centralized so a
// future confirmed category policy changes one tested boundary.
export const ptoCategoryConsumesBalance: Record<PtoCategory, boolean> = {
  vacation: true,
  sick: true,
  personal: true,
  other: true,
};

export const ptoUnitsSchema = z.number().int();
export const ptoDurationUnitsSchema = ptoUnitsSchema.min(1);

const halfDayValueSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length === 0 ? Number.NaN : value,
  z.coerce
    .number({ error: "Ingresá una cantidad de días válida." })
    .finite("Ingresá una cantidad de días válida.")
    .refine((value) => Number.isInteger(value * 2), {
      message: "Usá incrementos de medio día.",
    }),
);

export const ptoOpeningBalanceDaysSchema = halfDayValueSchema.transform(daysToUnits);
export const ptoAdjustmentDaysSchema = halfDayValueSchema
  .refine((value) => value !== 0, "El ajuste no puede ser cero.")
  .transform(daysToUnits);
export const ptoDurationDaysSchema = halfDayValueSchema
  .refine((value) => value >= 0.5, "La duración mínima es medio día.")
  .transform(daysToUnits);

export const ptoDraftInputSchema = z
  .object({
    category: ptoCategorySchema,
    collaboratorNote: z
      .string()
      .nullish()
      .transform((value) => (value?.trim() ? normalizeHumanText(value) : null))
      .pipe(z.string().max(1000).nullable()),
    durationUnits: ptoDurationUnitsSchema,
    endDate: isoCalendarDateSchema,
    startDate: isoCalendarDateSchema,
  })
  .superRefine((request, context) => {
    if (request.endDate < request.startDate) {
      context.addIssue({
        code: "custom",
        message: "La fecha final no puede ser anterior a la fecha inicial.",
        path: ["endDate"],
      });
      return;
    }

    if (
      request.durationUnits >
      inclusiveCalendarDays(request.startDate, request.endDate) * 2
    ) {
      context.addIssue({
        code: "custom",
        message: "La duración supera el rango de fechas seleccionado.",
        path: ["durationUnits"],
      });
    }
  });

export const ptoDecisionInputSchema = z.object({
  decision: z.enum(["approved", "denied"]),
  decisionNote: z
    .string()
    .transform((value) => (value.trim() ? normalizeHumanText(value) : null))
    .pipe(z.string().max(1000).nullable()),
  requestId: objectIdStringSchema,
});

export const ptoBalanceAdjustmentInputSchema = z.object({
  deltaUnits: ptoUnitsSchema.refine((value) => value !== 0),
  employeeId: objectIdStringSchema,
  reason: z.string().transform(normalizeHumanText).pipe(z.string().min(3).max(500)),
});

export type PtoDraftInput = z.output<typeof ptoDraftInputSchema>;

export type PtoStatusHistoryEntry = {
  actorPlatformUserId: ObjectId;
  from: PtoStatus | null;
  occurredAt: Date;
  to: PtoStatus;
};

export type PtoRequestDocument = {
  _id: ObjectId;
  assignedApproverPlatformUserId: ObjectId | null;
  balanceAfterUnits: number | null;
  balanceBeforeUnits: number | null;
  balanceDeltaUnits: number | null;
  cancelledAt: Date | null;
  category: PtoCategory;
  collaboratorNote: string | null;
  createdAt: Date;
  createdByPlatformUserId?: ObjectId;
  decidedAt: Date | null;
  decisionNote: string | null;
  durationUnits: number;
  endDate: string;
  requesterEmployeeId: ObjectId;
  requesterPlatformUserId: ObjectId;
  startDate: string;
  status: PtoStatus;
  statusHistory: PtoStatusHistoryEntry[];
  submittedAt: Date | null;
  updatedAt: Date;
};

export type PtoRequest = Omit<
  PtoRequestDocument,
  | "_id"
  | "assignedApproverPlatformUserId"
  | "createdByPlatformUserId"
  | "requesterEmployeeId"
  | "requesterPlatformUserId"
  | "statusHistory"
> & {
  assignedApproverPlatformUserId: string | null;
  createdByPlatformUserId: string;
  id: string;
  requesterEmployeeId: string;
  requesterPlatformUserId: string;
  statusHistory: Array<{
    actorPlatformUserId: string;
    from: PtoStatus | null;
    occurredAt: Date;
    to: PtoStatus;
  }>;
};

export type PtoBalanceDocument = {
  _id: ObjectId;
  createdAt: Date;
  currentBalanceUnits: number;
  employeeId: ObjectId;
  openingBalanceUnits: number;
  updatedAt: Date;
  version: number;
};

export type PtoBalanceLedgerKind = "opening" | "adjustment" | "approved_request";

export type PtoBalanceLedgerDocument = {
  _id: ObjectId;
  actorPlatformUserId: ObjectId;
  balanceAfterUnits: number;
  balanceBeforeUnits: number;
  createdAt: Date;
  deltaUnits: number;
  employeeId: ObjectId;
  kind: PtoBalanceLedgerKind;
  reason: string | null;
  requestId: ObjectId | null;
};

export class PtoDomainError extends Error {
  constructor(
    public readonly code:
      | "approver_ineligible"
      | "balance_exists"
      | "balance_missing"
      | "employee_missing"
      | "forbidden"
      | "request_missing"
      | "self_approval"
      | "stale_status",
  ) {
    super(code);
    this.name = "PtoDomainError";
  }
}

export function daysToUnits(days: number) {
  return Math.round(days * 2);
}

export function unitsToDays(units: number) {
  return units / 2;
}

export function formatPtoDays(units: number) {
  return new Intl.NumberFormat("es-CR", { maximumFractionDigits: 1 }).format(
    unitsToDays(units),
  );
}

function formatPtoShortDate(value: string) {
  const formatted = new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    weekday: "short",
  })
    .format(new Date(`${value}T12:00:00.000Z`))
    .replaceAll(".", "");

  return formatted
    .split(" ")
    .map((part) => part.charAt(0).toLocaleUpperCase("es-CR") + part.slice(1))
    .join(" ");
}

export function formatPtoDateRange(startDate: string, endDate: string) {
  const start = formatPtoShortDate(startDate);
  return startDate === endDate ? start : `${start} - ${formatPtoShortDate(endDate)}`;
}

export function inclusiveCalendarDays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

export function ptoRangesOverlap(
  first: { endDate: string; startDate: string },
  second: { endDate: string; startDate: string },
) {
  return first.startDate <= second.endDate && second.startDate <= first.endDate;
}

export function canTransitionPtoStatus(from: PtoStatus, to: PtoStatus) {
  return (
    (from === "draft" && (to === "pending" || to === "cancelled")) ||
    (from === "pending" && (to === "approved" || to === "denied" || to === "cancelled"))
  );
}
