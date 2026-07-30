import "server-only";

import type { IndexDescription } from "mongodb";

import { getDatabase } from "@/lib/server/mongodb";

const calendarIndexes: Readonly<Record<string, readonly IndexDescription[]>> = {
  calendar_event_audit: [
    {
      key: { targetEventId: 1, createdAt: -1 },
      name: "calendar_event_audit_target_timeline",
    },
    {
      key: { actorPlatformUserId: 1, createdAt: -1 },
      name: "calendar_event_audit_actor_timeline",
    },
  ],
  calendar_events: [
    {
      key: { status: 1, startsAt: 1, endsAt: 1 },
      name: "calendar_events_active_range",
    },
    {
      key: { organizerPlatformUserId: 1, status: 1, startsAt: 1 },
      name: "calendar_events_organizer",
    },
    {
      key: { departmentId: 1, status: 1, startsAt: 1 },
      name: "calendar_events_department",
      partialFilterExpression: { departmentId: { $type: "objectId" } },
    },
    {
      key: { inviteePlatformUserIds: 1, status: 1, startsAt: 1 },
      name: "calendar_events_invitees",
    },
  ],
};

declare global {
  var calendarIndexesPromise: Promise<void> | undefined;
}

export async function ensureCalendarIndexes() {
  if (!globalThis.calendarIndexesPromise) {
    globalThis.calendarIndexesPromise = (async () => {
      const database = await getDatabase();
      await Promise.all(
        Object.entries(calendarIndexes).flatMap(([collectionName, indexes]) => {
          const collection = database.collection(collectionName);
          return indexes.map((index) => collection.createIndex(index.key, index));
        }),
      );
    })();
  }

  return globalThis.calendarIndexesPromise;
}
