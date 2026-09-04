import "server-only";

import { ObjectId, type ClientSession } from "mongodb";

import { getDatabase } from "@/lib/server/mongodb";

export type ProductionTaskAuditAction =
  | "plan_created"
  | "plan_updated"
  | "plan_published"
  | "plan_copied"
  | "import_committed"
  | "task_completed"
  | "task_reopened";

type ProductionTaskAuditDocument = {
  _id: ObjectId;
  action: ProductionTaskAuditAction;
  actorPlatformUserId: ObjectId;
  changedFields: string[];
  createdAt: Date;
  metadata: {
    importedRowCount?: number;
    importModes?: string[];
    mappedAreaIds?: string[];
    mappedEmployeeIds?: string[];
    sourceSheetCount?: number;
    workbookHash?: string;
  } | null;
  targetPlanId: ObjectId;
  targetTaskId: ObjectId | null;
};

export async function recordProductionTaskAudit({
  action,
  actorPlatformUserId,
  changedFields,
  metadata = null,
  session,
  targetPlanId,
  targetTaskId = null,
}: {
  action: ProductionTaskAuditAction;
  actorPlatformUserId: string;
  changedFields: string[];
  metadata?: ProductionTaskAuditDocument["metadata"];
  session: ClientSession;
  targetPlanId: string;
  targetTaskId?: string | null;
}) {
  const database = await getDatabase();
  const document: ProductionTaskAuditDocument = {
    _id: new ObjectId(),
    action,
    actorPlatformUserId: new ObjectId(actorPlatformUserId),
    changedFields,
    createdAt: new Date(),
    metadata,
    targetPlanId: new ObjectId(targetPlanId),
    targetTaskId: targetTaskId ? new ObjectId(targetTaskId) : null,
  };

  await database
    .collection<ProductionTaskAuditDocument>("production_task_audit")
    .insertOne(document, { session });
}
