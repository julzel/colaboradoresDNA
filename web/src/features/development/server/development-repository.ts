import "server-only";

import { randomUUID } from "node:crypto";

import { ObjectId, type ClientSession } from "mongodb";

import {
  oneOnOneNarrativeSchema,
  type NormalizedOneOnOneDraftInput,
  type OneOnOneActionStatus,
  type OneOnOneDocument,
  type OneOnOneNarrative,
  type OneOnOneStatus,
} from "@/features/development/domain/one-on-one";
import { DevelopmentDomainError } from "@/features/development/domain/shared";
import { recordDevelopmentAudit } from "@/features/development/server/development-audit-repository";
import { encryptDevelopmentPayload } from "@/features/development/server/development-encryption";
import { getDatabase, getMongoClient } from "@/lib/server/mongodb";

type CalendarEventWriter = (session: ClientSession) => Promise<string>;

export type OneOnOneMutationResult = {
  calendarEventId: string | null;
  employeeId: string;
  id: string;
  status: OneOnOneStatus;
  version: number;
};

function prepareNarrative(input: NormalizedOneOnOneDraftInput) {
  const actions = input.narrative.agreedActions.map((action) => ({
    ...action,
    id: randomUUID(),
  }));
  const narrative: OneOnOneNarrative = {
    agreedActions: actions.map(({ description, id }) => ({ description, id })),
    discussionSections: input.narrative.discussionSections,
    sharedSummary: input.narrative.sharedSummary,
  };

  return {
    actionItems: actions.map(({ dueOn, id, owner }) => ({
      completedAt: null,
      dueOn,
      id,
      owner,
      status: "open" as const,
    })),
    narrative,
  };
}

function encryptOneOnOneNarrative(recordId: string, narrative: OneOnOneNarrative) {
  return encryptDevelopmentPayload({
    associatedData: { resourceId: recordId, resourceType: "one_on_one" },
    payload: narrative,
    schema: oneOnOneNarrativeSchema,
  });
}

function toMutationResult(document: OneOnOneDocument): OneOnOneMutationResult {
  return {
    calendarEventId: document.calendarEventId?.toHexString() ?? null,
    employeeId: document.employeeId.toHexString(),
    id: document._id.toHexString(),
    status: document.status,
    version: document.version,
  };
}

export async function createOneOnOneRecord({
  actorPlatformUserId,
  createCalendarEvent,
  employeeId,
  input,
  status,
}: {
  actorPlatformUserId: string;
  createCalendarEvent?: CalendarEventWriter | null;
  employeeId: string;
  input: NormalizedOneOnOneDraftInput;
  status: "draft" | "finalized";
}) {
  const database = await getDatabase();
  const collection = database.collection<OneOnOneDocument>("development_one_on_ones");
  const recordId = new ObjectId();
  const prepared = prepareNarrative(input);
  const encryptedNarrative = encryptOneOnOneNarrative(
    recordId.toHexString(),
    prepared.narrative,
  );
  const now = new Date();
  const document: OneOnOneDocument = {
    _id: recordId,
    actionItems: prepared.actionItems,
    amendments: [],
    authorPlatformUserId: new ObjectId(actorPlatformUserId),
    calendarEventId: null,
    createdAt: now,
    employeeId: new ObjectId(employeeId),
    finalizedAt: status === "finalized" ? now : null,
    finalizedByPlatformUserId:
      status === "finalized" ? new ObjectId(actorPlatformUserId) : null,
    narrative: encryptedNarrative,
    occurredOn: input.occurredOn,
    status,
    updatedAt: now,
    version: 1,
    voidPayload: null,
    voidedAt: null,
    voidedByPlatformUserId: null,
  };

  const client = await getMongoClient();
  await client.withSession(async (session) => {
    await session.withTransaction(async () => {
      if (createCalendarEvent) {
        document.calendarEventId = new ObjectId(await createCalendarEvent(session));
      }
      await collection.insertOne(document, { session });
      await recordDevelopmentAudit({
        input: {
          action: "one_on_one_created",
          actorPlatformUserId,
          changedFields: [
            "narrative_payload",
            "occurred_on",
            "action_items",
            "status",
            ...(document.calendarEventId ? (["calendar_event"] as const) : []),
          ],
          employeeId,
          outcome: "succeeded",
          resourceId: recordId.toHexString(),
          resourceType: "one_on_one",
        },
        session,
      });
      if (status === "finalized") {
        await recordDevelopmentAudit({
          input: {
            action: "one_on_one_finalized",
            actorPlatformUserId,
            changedFields: ["status"],
            employeeId,
            outcome: "succeeded",
            resourceId: recordId.toHexString(),
            resourceType: "one_on_one",
          },
          session,
        });
      }
    });
  });

  return toMutationResult(document);
}

export async function updateOneOnOneDraft({
  actorPlatformUserId,
  createCalendarEvent,
  employeeId,
  expectedVersion,
  input,
  meetingId,
  status,
}: {
  actorPlatformUserId: string;
  createCalendarEvent?: CalendarEventWriter | null;
  employeeId: string;
  expectedVersion: number;
  input: NormalizedOneOnOneDraftInput;
  meetingId: string;
  status: "draft" | "finalized";
}) {
  const database = await getDatabase();
  const collection = database.collection<OneOnOneDocument>("development_one_on_ones");
  const parsedMeetingId = new ObjectId(meetingId);
  const parsedEmployeeId = new ObjectId(employeeId);
  const prepared = prepareNarrative(input);
  const encryptedNarrative = encryptOneOnOneNarrative(meetingId, prepared.narrative);
  const client = await getMongoClient();
  let result: OneOnOneDocument | null = null;

  await client.withSession(async (session) => {
    await session.withTransaction(async () => {
      const existing = await collection.findOne(
        { _id: parsedMeetingId, employeeId: parsedEmployeeId },
        { projection: { calendarEventId: 1, status: 1, version: 1 }, session },
      );
      if (!existing) throw new DevelopmentDomainError("record_not_found");
      if (existing.status !== "draft") {
        throw new DevelopmentDomainError("invalid_transition");
      }
      if (existing.version !== expectedVersion) {
        throw new DevelopmentDomainError("conflict");
      }

      let calendarEventId = existing.calendarEventId ?? null;
      if (!calendarEventId && createCalendarEvent) {
        calendarEventId = new ObjectId(await createCalendarEvent(session));
      }
      const now = new Date();
      result = await collection.findOneAndUpdate(
        {
          _id: parsedMeetingId,
          employeeId: parsedEmployeeId,
          status: "draft",
          version: expectedVersion,
        },
        {
          $inc: { version: 1 },
          $set: {
            actionItems: prepared.actionItems,
            calendarEventId,
            finalizedAt: status === "finalized" ? now : null,
            finalizedByPlatformUserId:
              status === "finalized" ? new ObjectId(actorPlatformUserId) : null,
            narrative: encryptedNarrative,
            occurredOn: input.occurredOn,
            status,
            updatedAt: now,
          },
        },
        { returnDocument: "after", session },
      );
      if (!result) throw new DevelopmentDomainError("conflict");

      await recordDevelopmentAudit({
        input: {
          action: "one_on_one_updated",
          actorPlatformUserId,
          changedFields: [
            "narrative_payload",
            "occurred_on",
            "action_items",
            ...(calendarEventId && !existing.calendarEventId
              ? (["calendar_event"] as const)
              : []),
          ],
          employeeId,
          outcome: "succeeded",
          resourceId: meetingId,
          resourceType: "one_on_one",
        },
        session,
      });
      if (status === "finalized") {
        await recordDevelopmentAudit({
          input: {
            action: "one_on_one_finalized",
            actorPlatformUserId,
            changedFields: ["status"],
            employeeId,
            outcome: "succeeded",
            resourceId: meetingId,
            resourceType: "one_on_one",
          },
          session,
        });
      }
    });
  });

  if (!result) throw new DevelopmentDomainError("conflict");
  return toMutationResult(result);
}

export async function setOneOnOneActionStatus({
  actionId,
  actorPlatformUserId,
  employeeId,
  expectedVersion,
  meetingId,
  status,
}: {
  actionId: string;
  actorPlatformUserId: string;
  employeeId: string;
  expectedVersion: number;
  meetingId: string;
  status: Extract<OneOnOneActionStatus, "completed" | "open">;
}) {
  const database = await getDatabase();
  const collection = database.collection<OneOnOneDocument>("development_one_on_ones");
  const client = await getMongoClient();
  let result: OneOnOneDocument | null = null;

  await client.withSession(async (session) => {
    await session.withTransaction(async () => {
      const now = new Date();
      result = await collection.findOneAndUpdate(
        {
          _id: new ObjectId(meetingId),
          "actionItems.id": actionId,
          employeeId: new ObjectId(employeeId),
          status: "finalized",
          version: expectedVersion,
        },
        {
          $inc: { version: 1 },
          $set: {
            "actionItems.$[action].completedAt": status === "completed" ? now : null,
            "actionItems.$[action].status": status,
            updatedAt: now,
          },
        },
        {
          arrayFilters: [{ "action.id": actionId }],
          returnDocument: "after",
          session,
        },
      );
      if (!result) throw new DevelopmentDomainError("conflict");
      await recordDevelopmentAudit({
        input: {
          action: "one_on_one_updated",
          actorPlatformUserId,
          changedFields: ["action_items"],
          employeeId,
          outcome: "succeeded",
          resourceId: meetingId,
          resourceType: "one_on_one",
        },
        session,
      });
    });
  });

  if (!result) throw new DevelopmentDomainError("conflict");
  return toMutationResult(result);
}

export async function recordOneOnOneViewed({
  actorPlatformUserId,
  employeeId,
  meetingId,
}: {
  actorPlatformUserId: string;
  employeeId: string;
  meetingId: string;
}) {
  const client = await getMongoClient();
  await client.withSession(async (session) => {
    await session.withTransaction(async () => {
      await recordDevelopmentAudit({
        input: {
          action: "record_viewed",
          actorPlatformUserId,
          changedFields: [],
          employeeId,
          outcome: "succeeded",
          resourceId: meetingId,
          resourceType: "one_on_one",
        },
        session,
      });
    });
  });
}
