import "server-only";

import { ObjectId, type Collection } from "mongodb";

import { getDatabase } from "@/lib/server/mongodb";

export type AuthAuditAction =
  | "account_deactivated"
  | "account_reactivated"
  | "email_updated"
  | "invitation_created"
  | "invitation_deferred"
  | "invitation_failed"
  | "invitation_resent"
  | "role_updated"
  | "session_revocation_failed";

type AuthAuditDocument = {
  _id: ObjectId;
  action: AuthAuditAction;
  actorClerkUserId: string;
  actorPlatformUserId: ObjectId | null;
  createdAt: Date;
  metadata: Record<string, boolean | number | string | null>;
  targetPlatformUserId: ObjectId;
};

async function getAuthAuditCollection(): Promise<Collection<AuthAuditDocument>> {
  const database = await getDatabase();
  const collection = database.collection<AuthAuditDocument>("auth_audit");
  await collection.createIndex(
    { targetPlatformUserId: 1, createdAt: -1 },
    { name: "auth_audit_target_timeline" },
  );
  await collection.createIndex(
    { actorPlatformUserId: 1, createdAt: -1 },
    { name: "auth_audit_actor_timeline" },
  );

  return collection;
}

export async function recordAuthAudit({
  action,
  actorClerkUserId,
  actorPlatformUserId,
  metadata = {},
  targetPlatformUserId,
}: {
  action: AuthAuditAction;
  actorClerkUserId: string;
  actorPlatformUserId: string;
  metadata?: Record<string, boolean | number | string | null>;
  targetPlatformUserId: string;
}) {
  const collection = await getAuthAuditCollection();

  await collection.insertOne({
    _id: new ObjectId(),
    action,
    actorClerkUserId,
    actorPlatformUserId: new ObjectId(actorPlatformUserId),
    createdAt: new Date(),
    metadata,
    targetPlatformUserId: new ObjectId(targetPlatformUserId),
  });
}
