import "server-only";

import { ObjectId, type ClientSession } from "mongodb";

import { ensureCalendarIndexes } from "@/features/calendar/server/calendar-indexes";
import { getDatabase } from "@/lib/server/mongodb";

type CalendarAuditAction = "event_created" | "event_deleted" | "event_updated";

type CalendarAuditDocument = {
  _id: ObjectId;
  action: CalendarAuditAction;
  actorPlatformUserId: ObjectId;
  changedFields: string[];
  createdAt: Date;
  targetEventId: ObjectId;
};

export async function recordCalendarAudit({
  action,
  actorPlatformUserId,
  changedFields,
  session,
  targetEventId,
}: {
  action: CalendarAuditAction;
  actorPlatformUserId: string;
  changedFields: string[];
  session?: ClientSession;
  targetEventId: string;
}) {
  await ensureCalendarIndexes();
  const database = await getDatabase();
  const document: CalendarAuditDocument = {
    _id: new ObjectId(),
    action,
    actorPlatformUserId: new ObjectId(actorPlatformUserId),
    changedFields,
    createdAt: new Date(),
    targetEventId: new ObjectId(targetEventId),
  };

  await database
    .collection<CalendarAuditDocument>("calendar_event_audit")
    .insertOne(document, session ? { session } : undefined);
}
