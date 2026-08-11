import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ObjectId, type ClientSession } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createInternalOneOnOneCalendarEvent,
  findInternalOneOnOneCalendarEventSummaryForAdministrator,
  InternalCalendarIntegrationError,
} from "@/features/calendar/server/calendar-event-repository";

const mocks = vi.hoisted(() => ({
  collection: vi.fn(),
  employeeFindOne: vi.fn(),
  ensureCalendarIndexes: vi.fn(),
  eventFindOne: vi.fn(),
  eventInsertOne: vi.fn(),
  getDatabase: vi.fn(),
  getMongoClient: vi.fn(),
  platformUserFindOne: vi.fn(),
  recordCalendarAudit: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/features/calendar/server/calendar-indexes", () => ({
  ensureCalendarIndexes: mocks.ensureCalendarIndexes,
}));

vi.mock("@/features/calendar/server/calendar-audit-repository", () => ({
  recordCalendarAudit: mocks.recordCalendarAudit,
}));

vi.mock("@/lib/server/mongodb", () => ({
  getDatabase: mocks.getDatabase,
  getMongoClient: mocks.getMongoClient,
}));

const actor = {
  departmentId: null,
  platformUserId: "507f1f77bcf86cd799439011",
  role: "administrator" as const,
};
const targetEmployeeId = "507f1f77bcf86cd799439012";
const targetPlatformUserId = "507f1f77bcf86cd799439013";
const startsAt = new Date("2026-08-10T15:00:00.000Z");
const endsAt = new Date("2026-08-10T15:30:00.000Z");

function transactionSession(inTransaction = true) {
  return {
    inTransaction: vi.fn(() => inTransaction),
  } as unknown as ClientSession;
}

describe("internal 1:1 calendar integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.collection.mockImplementation((name: string) => {
      if (name === "employees") return { findOne: mocks.employeeFindOne };
      if (name === "calendar_events") {
        return {
          findOne: mocks.eventFindOne,
          insertOne: mocks.eventInsertOne,
        };
      }
      if (name === "platform_users") {
        return { findOne: mocks.platformUserFindOne };
      }
      return {};
    });
    mocks.getDatabase.mockResolvedValue({ collection: mocks.collection });
    mocks.employeeFindOne.mockResolvedValue({
      platformUserId: new ObjectId(targetPlatformUserId),
    });
    mocks.platformUserFindOne.mockResolvedValue({
      _id: new ObjectId(targetPlatformUserId),
    });
    mocks.eventInsertOne.mockResolvedValue({ acknowledged: true });
    mocks.recordCalendarAudit.mockResolvedValue(undefined);
  });

  it("creates only the fixed privacy-safe event and audits it in the caller session", async () => {
    const session = transactionSession();

    const event = await createInternalOneOnOneCalendarEvent({
      actor,
      endsAt,
      session,
      startsAt,
      targetEmployeeId,
    });

    expect(mocks.employeeFindOne).toHaveBeenCalledWith(
      {
        _id: new ObjectId(targetEmployeeId),
        employmentStatus: "active",
      },
      { projection: { platformUserId: 1 }, session },
    );
    expect(mocks.platformUserFindOne).toHaveBeenCalledWith(
      {
        _id: new ObjectId(targetPlatformUserId),
        status: { $in: ["active", "invited"] },
      },
      { projection: { _id: 1 }, session },
    );

    const [document, writeOptions] = mocks.eventInsertOne.mock.calls[0]!;
    expect(writeOptions).toEqual({ session });
    expect(document).toMatchObject({
      allDay: false,
      deletedAt: null,
      deletedByPlatformUserId: null,
      departmentId: null,
      description: null,
      endsAt,
      eventType: "one_on_one",
      location: null,
      meetingUrl: null,
      startsAt,
      status: "active",
      timezone: "America/Costa_Rica",
      title: "Reunión 1:1",
      visibility: "invited",
    });
    expect(document.inviteePlatformUserIds).toHaveLength(1);
    expect(document.inviteePlatformUserIds[0].toHexString()).toBe(targetPlatformUserId);
    expect(document.organizerPlatformUserId.toHexString()).toBe(actor.platformUserId);
    expect(mocks.recordCalendarAudit).toHaveBeenCalledWith({
      action: "event_created",
      actorPlatformUserId: actor.platformUserId,
      changedFields: [
        "eventType",
        "title",
        "startsAt",
        "endsAt",
        "visibility",
        "inviteePlatformUserIds",
      ],
      session,
      targetEventId: document._id.toHexString(),
    });
    expect(event).toMatchObject({
      allDay: false,
      description: null,
      eventType: "one_on_one",
      inviteePlatformUserIds: [targetPlatformUserId],
      location: null,
      meetingUrl: null,
      title: "Reunión 1:1",
      visibility: "invited",
    });
    expect(mocks.ensureCalendarIndexes).not.toHaveBeenCalled();
    expect(mocks.getMongoClient).not.toHaveBeenCalled();
  });

  it("rejects a non-administrator without touching calendar storage", async () => {
    await expect(
      createInternalOneOnOneCalendarEvent({
        actor: { ...actor, role: "supervisor" },
        endsAt,
        session: transactionSession(),
        startsAt,
        targetEmployeeId,
      }),
    ).rejects.toMatchObject({ code: "event_forbidden" });

    expect(mocks.getDatabase).not.toHaveBeenCalled();
    expect(mocks.eventInsertOne).not.toHaveBeenCalled();
    expect(mocks.recordCalendarAudit).not.toHaveBeenCalled();
  });

  it("requires the caller to own an active transaction", async () => {
    await expect(
      createInternalOneOnOneCalendarEvent({
        actor,
        endsAt,
        session: transactionSession(false),
        startsAt,
        targetEmployeeId,
      }),
    ).rejects.toBeInstanceOf(InternalCalendarIntegrationError);

    expect(mocks.getDatabase).not.toHaveBeenCalled();
    expect(mocks.eventInsertOne).not.toHaveBeenCalled();
    expect(mocks.recordCalendarAudit).not.toHaveBeenCalled();
  });

  it("rejects a target without an active or invited platform user", async () => {
    const session = transactionSession();
    mocks.platformUserFindOne.mockResolvedValue(null);

    await expect(
      createInternalOneOnOneCalendarEvent({
        actor,
        endsAt,
        session,
        startsAt,
        targetEmployeeId,
      }),
    ).rejects.toMatchObject({ code: "invitee_not_found" });

    expect(mocks.employeeFindOne.mock.calls[0]?.[1]).toMatchObject({ session });
    expect(mocks.platformUserFindOne.mock.calls[0]?.[1]).toMatchObject({ session });
    expect(mocks.eventInsertOne).not.toHaveBeenCalled();
    expect(mocks.recordCalendarAudit).not.toHaveBeenCalled();
  });

  it("returns an active linked summary through a narrow projection", async () => {
    const eventId = "507f1f77bcf86cd799439014";
    const session = transactionSession();
    mocks.eventFindOne.mockResolvedValue({
      _id: new ObjectId(eventId),
      endsAt,
      startsAt,
    });

    await expect(
      findInternalOneOnOneCalendarEventSummaryForAdministrator({
        actor,
        eventId,
        session,
      }),
    ).resolves.toEqual({
      endsAt: endsAt.toISOString(),
      id: eventId,
      startsAt: startsAt.toISOString(),
    });
    expect(mocks.eventFindOne).toHaveBeenCalledWith(
      {
        _id: new ObjectId(eventId),
        eventType: "one_on_one",
        status: "active",
        visibility: "invited",
      },
      {
        projection: { _id: 1, endsAt: 1, startsAt: 1 },
        session,
      },
    );
  });
});

describe("internal 1:1 calendar source contract", () => {
  const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const repositorySource = readFileSync(
    resolve(webRoot, "src/features/calendar/server/calendar-event-repository.ts"),
    "utf8",
  );
  const helperStart = repositorySource.indexOf(
    "export async function createInternalOneOnOneCalendarEvent",
  );
  const helperEnd = repositorySource.indexOf(
    "export async function findInternalOneOnOneCalendarEventSummaryForAdministrator",
    helperStart,
  );
  const writeHelperSource = repositorySource.slice(helperStart, helperEnd);

  it("keeps transaction ownership and index setup outside the helper", () => {
    expect(helperStart).toBeGreaterThan(-1);
    expect(helperEnd).toBeGreaterThan(helperStart);
    expect(writeHelperSource).toContain("session: ClientSession");
    expect(writeHelperSource).toContain("session.inTransaction()");
    expect(writeHelperSource).not.toContain("ensureCalendarIndexes");
    expect(writeHelperSource).not.toContain("getMongoClient");
    expect(writeHelperSource).not.toContain("withSession");
    expect(writeHelperSource).not.toContain("withTransaction");
  });

  it("requires every calendar audit write to receive the transaction session", () => {
    const auditSource = readFileSync(
      resolve(webRoot, "src/features/calendar/server/calendar-audit-repository.ts"),
      "utf8",
    );

    expect(auditSource).toContain("session: ClientSession");
    expect(auditSource).toContain("insertOne(document, { session })");
    expect(auditSource).not.toContain("ensureCalendarIndexes");
  });
});
