import type { ObjectId } from "mongodb";
import { z } from "zod";

import {
  isValidLocalDateTime,
  localDateTimeToUtc,
} from "@/features/calendar/domain/calendar-utils";
import {
  developmentIsoDateSchema,
  developmentNarrativeTextSchema,
  developmentSingleLineTextSchema,
  optionalDevelopmentNarrativeTextSchema,
  type DevelopmentEncryptedPayload,
} from "@/features/development/domain/shared";

export const oneOnOneStatusSchema = z.enum(["draft", "finalized", "voided"]);
export const oneOnOneActionOwnerSchema = z.enum(["employee", "organization", "shared"]);
export const oneOnOneActionStatusSchema = z.enum(["open", "completed", "cancelled"]);

export type OneOnOneStatus = z.infer<typeof oneOnOneStatusSchema>;
export type OneOnOneActionOwner = z.infer<typeof oneOnOneActionOwnerSchema>;
export type OneOnOneActionStatus = z.infer<typeof oneOnOneActionStatusSchema>;

const discussionSectionInputSchema = z
  .object({
    heading: developmentSingleLineTextSchema({ max: 120 }),
    notes: developmentNarrativeTextSchema({ max: 2000 }),
  })
  .strict();

const agreedActionInputSchema = z
  .object({
    description: developmentNarrativeTextSchema({ max: 300 }),
    dueOn: developmentIsoDateSchema.nullable(),
    owner: oneOnOneActionOwnerSchema,
  })
  .strict();

const editorActionInputSchema = z
  .object({
    description: developmentNarrativeTextSchema({ max: 300 }),
    dueOn: z
      .string()
      .trim()
      .transform((value) => value || null)
      .pipe(developmentIsoDateSchema.nullable()),
    owner: oneOnOneActionOwnerSchema,
  })
  .strict();

const editorSectionFields = {
  achievements: optionalDevelopmentNarrativeTextSchema(2000),
  blockers: optionalDevelopmentNarrativeTextSchema(2000),
  feedback: optionalDevelopmentNarrativeTextSchema(2000),
  organizationSupport: optionalDevelopmentNarrativeTextSchema(2000),
} as const;

const editorSectionHeadings = [
  ["achievements", "Avances y logros"],
  ["blockers", "Retos o bloqueos"],
  ["feedback", "Retroalimentación y oportunidades"],
  ["organizationSupport", "Apoyo acordado por la organización"],
] as const;

export const oneOnOneEditorInputSchema = z
  .object({
    ...editorSectionFields,
    agreedActions: z.array(editorActionInputSchema).max(20).default([]),
    calendarEndDateTime: z.string().trim().default(""),
    calendarStartDateTime: z.string().trim().default(""),
    occurredOn: developmentIsoDateSchema,
    scheduleCalendarEvent: z.boolean().default(false),
    sharedSummary: optionalDevelopmentNarrativeTextSchema(1500),
  })
  .strict()
  .superRefine((input, context) => {
    if (!input.scheduleCalendarEvent) return;

    if (!isValidLocalDateTime(input.calendarStartDateTime)) {
      context.addIssue({
        code: "custom",
        message: "Ingresá una fecha y hora inicial válidas.",
        path: ["calendarStartDateTime"],
      });
    }
    if (!isValidLocalDateTime(input.calendarEndDateTime)) {
      context.addIssue({
        code: "custom",
        message: "Ingresá una fecha y hora final válidas.",
        path: ["calendarEndDateTime"],
      });
    }
    if (
      isValidLocalDateTime(input.calendarStartDateTime) &&
      !input.calendarStartDateTime.startsWith(input.occurredOn)
    ) {
      context.addIssue({
        code: "custom",
        message: "La cita debe programarse en la fecha del 1:1.",
        path: ["calendarStartDateTime"],
      });
    }
    if (
      isValidLocalDateTime(input.calendarEndDateTime) &&
      !input.calendarEndDateTime.startsWith(input.occurredOn)
    ) {
      context.addIssue({
        code: "custom",
        message: "La cita debe terminar en la fecha del 1:1.",
        path: ["calendarEndDateTime"],
      });
    }
    if (
      isValidLocalDateTime(input.calendarStartDateTime) &&
      isValidLocalDateTime(input.calendarEndDateTime) &&
      localDateTimeToUtc(input.calendarEndDateTime) <=
        localDateTimeToUtc(input.calendarStartDateTime)
    ) {
      context.addIssue({
        code: "custom",
        message: "La hora final debe ser posterior a la inicial.",
        path: ["calendarEndDateTime"],
      });
    }
  })
  .transform((input) => ({
    calendarSchedule: input.scheduleCalendarEvent
      ? {
          endDateTime: input.calendarEndDateTime,
          startDateTime: input.calendarStartDateTime,
        }
      : null,
    record: {
      narrative: {
        agreedActions: input.agreedActions,
        discussionSections: editorSectionHeadings.flatMap(([key, heading]) => {
          const notes = input[key];
          return notes ? [{ heading, notes }] : [];
        }),
        sharedSummary: input.sharedSummary,
      },
      occurredOn: input.occurredOn,
    },
  }));

export const oneOnOneNarrativeInputSchema = z
  .object({
    agreedActions: z.array(agreedActionInputSchema).max(20).default([]),
    discussionSections: z.array(discussionSectionInputSchema).max(12).default([]),
    sharedSummary: optionalDevelopmentNarrativeTextSchema(1500),
  })
  .strict();

export const oneOnOneNarrativeSchema = z
  .object({
    agreedActions: z
      .array(
        z
          .object({
            description: developmentNarrativeTextSchema({ max: 300 }),
            id: z.uuid(),
          })
          .strict(),
      )
      .max(20),
    discussionSections: z.array(discussionSectionInputSchema).max(12),
    sharedSummary: optionalDevelopmentNarrativeTextSchema(1500),
  })
  .strict();

const oneOnOneRecordInputShape = {
  narrative: oneOnOneNarrativeInputSchema,
  occurredOn: developmentIsoDateSchema,
};

export const oneOnOneDraftInputSchema = z.object(oneOnOneRecordInputShape).strict();

export const oneOnOneFinalizationInputSchema = z
  .object(oneOnOneRecordInputShape)
  .strict()
  .superRefine(({ narrative }, context) => {
    if (narrative.sharedSummary === null && narrative.discussionSections.length === 0) {
      context.addIssue({
        code: "custom",
        message:
          "Agregá un resumen compartido o al menos una sección antes de finalizar.",
        path: ["narrative", "sharedSummary"],
      });
    }
  });

export const oneOnOneAmendmentInputSchema = z
  .object({
    correction: developmentNarrativeTextSchema({ max: 2000 }),
    reason: developmentNarrativeTextSchema({ max: 1000 }),
  })
  .strict();

export const oneOnOneVoidInputSchema = z
  .object({
    reason: developmentNarrativeTextSchema({ max: 1000 }),
  })
  .strict();

export type OneOnOneDraftInput = z.input<typeof oneOnOneDraftInputSchema>;
export type OneOnOneEditorInput = z.input<typeof oneOnOneEditorInputSchema>;
export type NormalizedOneOnOneEditorInput = z.output<typeof oneOnOneEditorInputSchema>;
export type NormalizedOneOnOneDraftInput = z.output<typeof oneOnOneDraftInputSchema>;
export type OneOnOneNarrative = z.output<typeof oneOnOneNarrativeSchema>;
export type OneOnOneAmendment = z.output<typeof oneOnOneAmendmentInputSchema>;
export type OneOnOneVoidReason = z.output<typeof oneOnOneVoidInputSchema>;

export type OneOnOneAmendmentDocument = {
  _id: ObjectId;
  authorPlatformUserId: ObjectId;
  createdAt: Date;
  payload: DevelopmentEncryptedPayload;
};

export type OneOnOneActionMetadataDocument = {
  completedAt: Date | null;
  dueOn: string | null;
  id: string;
  owner: OneOnOneActionOwner;
  status: OneOnOneActionStatus;
};

export type OneOnOneDocument = {
  _id: ObjectId;
  actionItems: OneOnOneActionMetadataDocument[];
  amendments: OneOnOneAmendmentDocument[];
  authorPlatformUserId: ObjectId;
  calendarEventId: ObjectId | null;
  createdAt: Date;
  employeeId: ObjectId;
  finalizedAt: Date | null;
  finalizedByPlatformUserId: ObjectId | null;
  narrative: DevelopmentEncryptedPayload;
  occurredOn: string;
  status: OneOnOneStatus;
  updatedAt: Date;
  version: number;
  voidPayload: DevelopmentEncryptedPayload | null;
  voidedAt: Date | null;
  voidedByPlatformUserId: ObjectId | null;
};

export type OneOnOneTimelineSummary = {
  amendmentCount: number;
  authorPlatformUserId: string;
  calendarEventId: string | null;
  employeeId: string;
  finalizedAt: string | null;
  id: string;
  occurredOn: string;
  status: OneOnOneStatus;
  updatedAt: string;
  version: number;
};

export type OneOnOneDetail = OneOnOneTimelineSummary & {
  actions: Array<{
    completedAt: string | null;
    description: string;
    dueOn: string | null;
    id: string;
    owner: OneOnOneActionOwner;
    status: OneOnOneActionStatus;
  }>;
  discussionSections: Array<{ heading: string; notes: string }>;
  sharedSummary: string | null;
};

export function canTransitionOneOnOneStatus(from: OneOnOneStatus, to: OneOnOneStatus) {
  return (
    (from === "draft" && (to === "finalized" || to === "voided")) ||
    (from === "finalized" && to === "voided")
  );
}
