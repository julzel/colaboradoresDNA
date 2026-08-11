import "server-only";

import { ObjectId, type ClientSession } from "mongodb";
import { z } from "zod";

import { developmentObjectIdSchema } from "@/features/development/domain/shared";
import { getDatabase } from "@/lib/server/mongodb";

export const developmentAuditActionSchema = z.enum([
  "record_viewed",
  "one_on_one_created",
  "one_on_one_updated",
  "one_on_one_finalized",
  "one_on_one_amended",
  "one_on_one_voided",
  "skill_created",
  "skill_updated",
  "skill_status_changed",
  "skill_assessed",
  "goal_created",
  "goal_updated",
  "goal_status_changed",
  "goal_progress_added",
  "record_archived",
  "retention_purge_completed",
]);

export const developmentAuditResourceTypeSchema = z.enum([
  "development_profile",
  "one_on_one",
  "skill",
  "skill_assessment",
  "development_goal",
  "development_goal_update",
  "retention_batch",
]);

export const developmentAuditChangedFieldSchema = z.enum([
  "action_items",
  "amendments",
  "archived_at",
  "cadence_days",
  "calendar_event",
  "category",
  "completion",
  "description",
  "evidence_payload",
  "level",
  "level_anchors",
  "linked_skills",
  "name",
  "narrative_payload",
  "occurred_on",
  "origin_one_on_one",
  "progress_payload",
  "start_date",
  "status",
  "target_date",
  "void_payload",
]);

export const developmentAuditOutcomeSchema = z.enum([
  "succeeded",
  "denied",
  "conflict",
  "failed",
]);

export type DevelopmentAuditAction = z.infer<typeof developmentAuditActionSchema>;
export type DevelopmentAuditResourceType = z.infer<
  typeof developmentAuditResourceTypeSchema
>;
export type DevelopmentAuditChangedField = z.infer<
  typeof developmentAuditChangedFieldSchema
>;
export type DevelopmentAuditOutcome = z.infer<typeof developmentAuditOutcomeSchema>;

export const developmentAuditInputSchema = z
  .object({
    action: developmentAuditActionSchema,
    actorPlatformUserId: developmentObjectIdSchema,
    changedFields: z
      .array(developmentAuditChangedFieldSchema)
      .max(32)
      .transform((fields) => [...new Set(fields)]),
    employeeId: developmentObjectIdSchema.nullable(),
    outcome: developmentAuditOutcomeSchema,
    resourceId: developmentObjectIdSchema,
    resourceType: developmentAuditResourceTypeSchema,
  })
  .strict();

export type DevelopmentAuditInput = z.input<typeof developmentAuditInputSchema>;

export type DevelopmentAuditDocument = {
  _id: ObjectId;
  action: DevelopmentAuditAction;
  actorPlatformUserId: ObjectId;
  changedFields: DevelopmentAuditChangedField[];
  createdAt: Date;
  employeeId: ObjectId | null;
  outcome: DevelopmentAuditOutcome;
  resourceId: ObjectId;
  resourceType: DevelopmentAuditResourceType;
};

export async function recordDevelopmentAudit({
  input,
  session,
}: {
  input: DevelopmentAuditInput;
  session: ClientSession;
}) {
  const parsed = developmentAuditInputSchema.parse(input);
  const database = await getDatabase();
  const document: DevelopmentAuditDocument = {
    _id: new ObjectId(),
    action: parsed.action,
    actorPlatformUserId: new ObjectId(parsed.actorPlatformUserId),
    changedFields: parsed.changedFields,
    createdAt: new Date(),
    employeeId: parsed.employeeId ? new ObjectId(parsed.employeeId) : null,
    outcome: parsed.outcome,
    resourceId: new ObjectId(parsed.resourceId),
    resourceType: parsed.resourceType,
  };

  await database
    .collection<DevelopmentAuditDocument>("development_audit")
    .insertOne(document, { session });
}
