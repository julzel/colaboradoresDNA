import type { ObjectId } from "mongodb";
import { z } from "zod";

import {
  developmentIsoDateSchema,
  developmentNarrativeTextSchema,
  developmentObjectIdSchema,
  developmentSingleLineTextSchema,
  optionalDevelopmentNarrativeTextSchema,
  type DevelopmentEncryptedPayload,
} from "@/features/development/domain/shared";

export const developmentGoalStatusSchema = z.enum([
  "planned",
  "in_progress",
  "completed",
  "paused",
]);

export type DevelopmentGoalStatus = z.infer<typeof developmentGoalStatusSchema>;

export const developmentGoalNarrativeSchema = z
  .object({
    completionNote: optionalDevelopmentNarrativeTextSchema(1000),
    intendedOutcome: developmentNarrativeTextSchema({ max: 1000 }),
    organizationalSupport: optionalDevelopmentNarrativeTextSchema(1000),
    successCriteria: developmentNarrativeTextSchema({ max: 1000 }),
    title: developmentSingleLineTextSchema({ max: 160 }),
  })
  .strict();

export const developmentGoalInputSchema = z
  .object({
    linkedSkillIds: z.array(developmentObjectIdSchema).max(20).default([]),
    narrative: developmentGoalNarrativeSchema.omit({ completionNote: true }),
    originOneOnOneId: developmentObjectIdSchema.nullable().default(null),
    startDate: developmentIsoDateSchema,
    targetDate: developmentIsoDateSchema,
  })
  .strict()
  .superRefine((goal, context) => {
    if (goal.targetDate < goal.startDate) {
      context.addIssue({
        code: "custom",
        message: "La fecha objetivo no puede ser anterior a la fecha inicial.",
        path: ["targetDate"],
      });
    }
  })
  .transform((goal) => ({
    ...goal,
    linkedSkillIds: [...new Set(goal.linkedSkillIds)],
  }));

export const developmentGoalProgressInputSchema = z
  .object({
    note: developmentNarrativeTextSchema({ max: 1000 }),
    occurredOn: developmentIsoDateSchema,
  })
  .strict();

export const developmentGoalCompletionInputSchema = z
  .object({
    completionNote: developmentNarrativeTextSchema({ max: 1000 }),
  })
  .strict();

export type DevelopmentGoalInput = z.input<typeof developmentGoalInputSchema>;
export type NormalizedDevelopmentGoalInput = z.output<
  typeof developmentGoalInputSchema
>;
export type DevelopmentGoalNarrative = z.output<typeof developmentGoalNarrativeSchema>;
export type DevelopmentGoalProgressInput = z.output<
  typeof developmentGoalProgressInputSchema
>;

export type DevelopmentGoalStatusHistoryEntry = {
  actorPlatformUserId: ObjectId;
  from: DevelopmentGoalStatus | null;
  occurredAt: Date;
  to: DevelopmentGoalStatus;
};

export type DevelopmentGoalDocument = {
  _id: ObjectId;
  completedAt: Date | null;
  createdAt: Date;
  createdByPlatformUserId: ObjectId;
  employeeId: ObjectId;
  linkedSkillIds: ObjectId[];
  narrative: DevelopmentEncryptedPayload;
  originOneOnOneId: ObjectId | null;
  startDate: string;
  status: DevelopmentGoalStatus;
  statusHistory: DevelopmentGoalStatusHistoryEntry[];
  targetDate: string;
  updatedAt: Date;
  updatedByPlatformUserId: ObjectId;
  version: number;
};

export type DevelopmentGoalUpdateDocument = {
  _id: ObjectId;
  authorPlatformUserId: ObjectId;
  createdAt: Date;
  goalId: ObjectId;
  note: DevelopmentEncryptedPayload;
  occurredAt: Date;
};

export type DevelopmentGoalSummary = {
  completedAt: string | null;
  employeeId: string;
  id: string;
  linkedSkillIds: string[];
  originOneOnOneId: string | null;
  startDate: string;
  status: DevelopmentGoalStatus;
  targetDate: string;
  updatedAt: string;
  version: number;
};

export function canTransitionDevelopmentGoalStatus(
  from: DevelopmentGoalStatus,
  to: DevelopmentGoalStatus,
) {
  if (from === to) return false;

  if (from === "planned") {
    return ["in_progress", "paused", "completed"].includes(to);
  }
  if (from === "in_progress") {
    return ["paused", "completed"].includes(to);
  }
  if (from === "paused") {
    return ["planned", "in_progress", "completed"].includes(to);
  }

  return from === "completed" && to === "in_progress";
}
