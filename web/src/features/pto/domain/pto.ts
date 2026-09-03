import type { ObjectId } from "mongodb";
import { z } from "zod";

import {
  isoCalendarDateSchema,
  normalizeHumanText,
  objectIdStringSchema,
} from "@/features/employees/domain/shared";

export const ptoCategories = [
  "vacation",
  "incapacity",
  "maternity",
  "paternity",
  "unpaid_leave",
  "bereavement",
  "other",
] as const;

export const ptoCategorySchema = z.enum(ptoCategories);
export const ptoStatusSchema = z.enum([
  "draft",
  "pending",
  "approved",
  "denied",
  "cancelled",
]);

export type PtoCategory = z.infer<typeof ptoCategorySchema>;
export type PtoStatus = z.infer<typeof ptoStatusSchema>;

export function normalizePtoCategory(category: unknown): PtoCategory {
  if (category === "sick") return "incapacity";
  if (category === "personal") return "other";
  const parsed = ptoCategorySchema.safeParse(category);
  return parsed.success ? parsed.data : "other";
}

export const ptoCategoryLabels: Record<PtoCategory, string> = {
  vacation: "Vacaciones",
  incapacity: "Incapacidad",
  maternity: "Maternidad",
  paternity: "Paternidad",
  unpaid_leave: "Permiso sin goce salarial",
  bereavement: "Duelo",
  other: "Otro",
};

export const ptoStatusLabels: Record<PtoStatus, string> = {
  approved: "Aprobada",
  cancelled: "Cancelada",
  denied: "Denegada",
  draft: "Borrador",
  pending: "Pendiente",
};

// Vacation is the only category that changes the PTO balance. Keep this policy
// centralized so submission warnings and transactional approval stay aligned.
export const ptoCategoryConsumesBalance: Record<PtoCategory, boolean> = {
  vacation: true,
  incapacity: false,
  maternity: false,
  paternity: false,
  unpaid_leave: false,
  bereavement: false,
  other: false,
};

export const ptoUnitsSchema = z.number().int();
export const ptoDurationUnitsSchema = ptoUnitsSchema.min(1);
export const ptoRequestedPortionSchema = z.enum(["full", "half"]);
export const PTO_SCHEDULE_DURATION_POLICY_VERSION = 1;

export const ptoDurationCalculationSchema = z.object({
  calculatedAt: z.date(),
  calculationPolicyVersion: z.number().int().positive(),
  sourceScheduleIds: z.array(objectIdStringSchema),
  totalScheduledMinutes: z.number().int().nonnegative(),
  workingDates: z.array(isoCalendarDateSchema),
});

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

const ptoDraftCommandFields = {
  category: ptoCategorySchema,
  collaboratorNote: z
    .string()
    .nullish()
    .transform((value) => (value?.trim() ? normalizeHumanText(value) : null))
    .pipe(z.string().max(1000).nullable()),
  endDate: isoCalendarDateSchema,
  requestedPortion: ptoRequestedPortionSchema,
  startDate: isoCalendarDateSchema,
};

function validatePtoDraftRange(
  request: { endDate: string; startDate: string },
  context: z.RefinementCtx,
) {
  if (request.endDate < request.startDate) {
    context.addIssue({
      code: "custom",
      message: "La fecha final no puede ser anterior a la fecha inicial.",
      path: ["endDate"],
    });
  }
}

/** External draft command. Calculation metadata is owned by the server. */
export const ptoDraftCommandSchema = z
  .object(ptoDraftCommandFields)
  .superRefine(validatePtoDraftRange);

/** Persistence input after the server has derived the duration snapshot. */
export const ptoDraftInputSchema = z
  .object({
    ...ptoDraftCommandFields,
    durationCalculation: ptoDurationCalculationSchema.nullish(),
    durationUnits: ptoDurationUnitsSchema,
  })
  .superRefine(validatePtoDraftRange);

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

export type PtoDraftCommand = z.output<typeof ptoDraftCommandSchema>;
export type PtoDraftInput = z.output<typeof ptoDraftInputSchema>;
export type PtoDurationCalculation = z.output<typeof ptoDurationCalculationSchema>;

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
  durationCalculation?: PtoDurationCalculation | null;
  durationUnits: number;
  endDate: string;
  requestedPortion?: z.infer<typeof ptoRequestedPortionSchema>;
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
  | "durationCalculation"
  | "requestedPortion"
  | "requesterEmployeeId"
  | "requesterPlatformUserId"
  | "statusHistory"
> & {
  assignedApproverPlatformUserId: string | null;
  createdByPlatformUserId: string;
  durationCalculation: PtoDurationCalculation | null;
  id: string;
  requesterEmployeeId: string;
  requesterPlatformUserId: string;
  requestedPortion: z.infer<typeof ptoRequestedPortionSchema>;
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
      | "no_scheduled_workdays"
      | "partial_day_range"
      | "request_missing"
      | "schedule_incomplete"
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
