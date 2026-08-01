import "server-only";

import { ObjectId, type ClientSession } from "mongodb";

import { ensurePtoIndexes } from "@/features/pto/server/pto-indexes";
import { getDatabase } from "@/lib/server/mongodb";

export type PtoAuditAction =
  | "balance_adjusted"
  | "balance_opened"
  | "request_approved"
  | "request_cancelled"
  | "request_created"
  | "request_denied"
  | "request_approver_reassigned"
  | "request_submitted"
  | "request_updated"
  | "settings_updated";

type PtoAuditDocument = {
  _id: ObjectId;
  action: PtoAuditAction;
  actorPlatformUserId: ObjectId;
  changedFields: string[];
  createdAt: Date;
  targetEmployeeId: ObjectId | null;
  targetRequestId: ObjectId | null;
};

export async function recordPtoAudit({
  action,
  actorPlatformUserId,
  changedFields,
  session,
  targetEmployeeId = null,
  targetRequestId = null,
}: {
  action: PtoAuditAction;
  actorPlatformUserId: string;
  changedFields: readonly string[];
  session: ClientSession;
  targetEmployeeId?: string | null;
  targetRequestId?: string | null;
}) {
  await ensurePtoIndexes();
  const database = await getDatabase();
  const document: PtoAuditDocument = {
    _id: new ObjectId(),
    action,
    actorPlatformUserId: new ObjectId(actorPlatformUserId),
    changedFields: [...changedFields],
    createdAt: new Date(),
    targetEmployeeId: targetEmployeeId ? new ObjectId(targetEmployeeId) : null,
    targetRequestId: targetRequestId ? new ObjectId(targetRequestId) : null,
  };
  await database.collection<PtoAuditDocument>("pto_audit").insertOne(document, {
    session,
  });
}
