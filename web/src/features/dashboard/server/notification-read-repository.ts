import "server-only";

import { ObjectId, type IndexDescription } from "mongodb";

import { objectIdStringSchema } from "@/features/employees/domain/shared";
import { getDatabase } from "@/lib/server/mongodb";

type DashboardNotificationReadDocument = {
  _id: ObjectId;
  createdAt: Date;
  notificationKey: string;
  platformUserId: ObjectId;
  readAt: Date;
};

const notificationReadIndexes: readonly IndexDescription[] = [
  {
    key: { platformUserId: 1, notificationKey: 1 },
    name: "dashboard_notification_reads_user_key_unique",
    unique: true,
  },
];

declare global {
  var dashboardNotificationReadIndexesPromise: Promise<void> | undefined;
}

async function getNotificationReads() {
  const database = await getDatabase();
  const reads = database.collection<DashboardNotificationReadDocument>(
    "dashboard_notification_reads",
  );
  if (!globalThis.dashboardNotificationReadIndexesPromise) {
    globalThis.dashboardNotificationReadIndexesPromise = reads
      .createIndexes([...notificationReadIndexes])
      .then(() => undefined)
      .catch((error: unknown) => {
        globalThis.dashboardNotificationReadIndexesPromise = undefined;
        throw error;
      });
  }
  await globalThis.dashboardNotificationReadIndexesPromise;
  return reads;
}

export async function listReadNotificationKeys({
  notificationKeys,
  platformUserId,
}: {
  notificationKeys: string[];
  platformUserId: string;
}) {
  objectIdStringSchema.parse(platformUserId);
  if (notificationKeys.length === 0) return new Set<string>();
  const reads = await getNotificationReads();
  const documents = await reads
    .find(
      {
        notificationKey: { $in: notificationKeys },
        platformUserId: new ObjectId(platformUserId),
      },
      { projection: { notificationKey: 1 } },
    )
    .toArray();
  return new Set(documents.map((document) => document.notificationKey));
}

export async function markNotificationKeysRead({
  notificationKeys,
  platformUserId,
}: {
  notificationKeys: string[];
  platformUserId: string;
}) {
  objectIdStringSchema.parse(platformUserId);
  const uniqueKeys = [...new Set(notificationKeys)];
  if (uniqueKeys.length === 0) return;
  const reads = await getNotificationReads();
  const now = new Date();
  const platformObjectId = new ObjectId(platformUserId);
  await reads.bulkWrite(
    uniqueKeys.map((notificationKey) => ({
      updateOne: {
        filter: { notificationKey, platformUserId: platformObjectId },
        update: {
          $set: { readAt: now },
          $setOnInsert: {
            _id: new ObjectId(),
            createdAt: now,
            notificationKey,
            platformUserId: platformObjectId,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );
}
