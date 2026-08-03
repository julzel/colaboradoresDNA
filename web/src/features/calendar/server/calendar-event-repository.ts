import "server-only";

import { ObjectId, type Collection, type Filter } from "mongodb";

import type {
  PlatformRole,
  PlatformUserDocument,
} from "@/features/auth/domain/platform-user";
import {
  CalendarDomainError,
  toCalendarEvent,
  type CalendarEvent,
  type CalendarEventDocument,
  type NormalizedCalendarEventInput,
} from "@/features/calendar/domain/calendar-event";
import type { DepartmentDocument } from "@/features/employees/domain/department";
import {
  formatEmployeePreferredDisplayName,
  type EmployeeDocument,
} from "@/features/employees/domain/employee";
import { ensureCalendarIndexes } from "@/features/calendar/server/calendar-indexes";
import { recordCalendarAudit } from "@/features/calendar/server/calendar-audit-repository";
import { getDatabase, getMongoClient } from "@/lib/server/mongodb";

export type CalendarActor = {
  departmentId: string | null;
  platformUserId: string;
  role: PlatformRole;
};

export type CalendarEventTargetOptions = {
  departments: Array<{ id: string; name: string }>;
  people: Array<{ displayName: string; id: string }>;
};

export type CalendarEventNotification = Pick<
  CalendarEvent,
  | "allDay"
  | "endDate"
  | "endsAt"
  | "eventType"
  | "id"
  | "startDate"
  | "startsAt"
  | "title"
>;

export type CalendarEventDetail = {
  canManage: boolean;
  departmentName: string | null;
  event: CalendarEvent;
  invitees: Array<{ displayName: string; id: string }>;
  organizerName: string;
};

async function getCalendarCollections() {
  const database = await getDatabase();
  return {
    departments: database.collection<DepartmentDocument>("departments"),
    employees: database.collection<EmployeeDocument>("employees"),
    events: database.collection<CalendarEventDocument>("calendar_events"),
    platformUsers: database.collection<PlatformUserDocument>("platform_users"),
  };
}

function visibleEventFilter(actor: CalendarActor): Filter<CalendarEventDocument> {
  if (actor.role === "administrator") return {};

  const actorId = new ObjectId(actor.platformUserId);
  const visibility: Filter<CalendarEventDocument>[] = [
    { visibility: "company" },
    { organizerPlatformUserId: actorId },
    {
      inviteePlatformUserIds: actorId,
    },
  ];

  if (actor.departmentId) {
    visibility.push({
      departmentId: new ObjectId(actor.departmentId),
      visibility: "department",
    });
  }

  return { $or: visibility };
}

export function canManageCalendarEvent(actor: CalendarActor, event: CalendarEvent) {
  if (actor.role === "administrator") return true;
  if (actor.role !== "supervisor") return false;

  return (
    event.organizerPlatformUserId === actor.platformUserId ||
    (event.visibility === "department" &&
      Boolean(actor.departmentId) &&
      event.departmentId === actor.departmentId)
  );
}

export async function listVisibleCalendarEvents({
  actor,
  endsAt,
  startsAt,
}: {
  actor: CalendarActor;
  endsAt: Date;
  startsAt: Date;
}) {
  await ensureCalendarIndexes();
  const { events } = await getCalendarCollections();
  const documents = await events
    .find({
      ...visibleEventFilter(actor),
      endsAt: { $gt: startsAt },
      startsAt: { $lt: endsAt },
      status: "active",
    })
    .sort({ startsAt: 1, title: 1 })
    .toArray();

  return documents.map(toCalendarEvent);
}

export async function findVisibleCalendarEventById({
  actor,
  eventId,
}: {
  actor: CalendarActor;
  eventId: string;
}) {
  if (!ObjectId.isValid(eventId)) return null;
  await ensureCalendarIndexes();
  const { events } = await getCalendarCollections();
  const document = await events.findOne({
    _id: new ObjectId(eventId),
    ...visibleEventFilter(actor),
    status: "active",
  });

  return document ? toCalendarEvent(document) : null;
}

export async function getCalendarEventDetail({
  actor,
  eventId,
}: {
  actor: CalendarActor;
  eventId: string;
}): Promise<CalendarEventDetail | null> {
  const event = await findVisibleCalendarEventById({ actor, eventId });
  if (!event) return null;
  const { departments, employees, platformUsers } = await getCalendarCollections();
  const peopleIds = [
    event.organizerPlatformUserId,
    ...event.inviteePlatformUserIds,
  ].map((id) => new ObjectId(id));
  const [people, employeeProfiles, department] = await Promise.all([
    platformUsers
      .find({ _id: { $in: peopleIds } }, { projection: { displayName: 1 } })
      .toArray(),
    employees
      .find(
        { platformUserId: { $in: peopleIds } },
        {
          projection: {
            firstSurname: 1,
            givenNames: 1,
            platformUserId: 1,
            preferredName: 1,
            secondSurname: 1,
          },
        },
      )
      .toArray(),
    event.departmentId
      ? departments.findOne(
          { _id: new ObjectId(event.departmentId) },
          { projection: { name: 1 } },
        )
      : null,
  ]);
  const names = new Map(
    people.map((person) => [person._id.toHexString(), person.displayName]),
  );
  for (const employee of employeeProfiles) {
    names.set(
      employee.platformUserId.toHexString(),
      formatEmployeePreferredDisplayName(employee),
    );
  }

  return {
    canManage: canManageCalendarEvent(actor, event),
    departmentName: department?.name ?? null,
    event,
    invitees: event.inviteePlatformUserIds.map((id) => ({
      displayName: names.get(id) ?? "Cuenta no disponible",
      id,
    })),
    organizerName: names.get(event.organizerPlatformUserId) ?? "Cuenta no disponible",
  };
}

async function validateTargets(
  input: NormalizedCalendarEventInput,
  actor: CalendarActor,
) {
  const { departments, employees, platformUsers } = await getCalendarCollections();

  if (input.departmentId) {
    const department = await departments.findOne({
      _id: new ObjectId(input.departmentId),
      status: "active",
    });
    if (!department) throw new CalendarDomainError("department_not_found");
    if (actor.role === "supervisor" && input.departmentId !== actor.departmentId) {
      throw new CalendarDomainError("department_forbidden");
    }
  }

  if (input.inviteePlatformUserIds.length > 0) {
    if (input.inviteePlatformUserIds.includes(actor.platformUserId)) {
      throw new CalendarDomainError("invitee_not_found");
    }
    const ids = input.inviteePlatformUserIds.map((id) => new ObjectId(id));
    const [employeeCount, userCount] = await Promise.all([
      employees.countDocuments({
        employmentStatus: "active",
        platformUserId: { $in: ids },
      }),
      platformUsers.countDocuments({
        _id: { $in: ids },
        status: { $in: ["active", "invited"] },
      }),
    ]);
    if (employeeCount !== ids.length || userCount !== ids.length) {
      throw new CalendarDomainError("invitee_not_found");
    }
  }
}

export async function createCalendarEvent({
  actor,
  input,
}: {
  actor: CalendarActor;
  input: NormalizedCalendarEventInput;
}) {
  await ensureCalendarIndexes();
  await validateTargets(input, actor);
  const { events } = await getCalendarCollections();
  const now = new Date();
  const document: CalendarEventDocument = {
    _id: new ObjectId(),
    allDay: input.allDay,
    createdAt: now,
    deletedAt: null,
    deletedByPlatformUserId: null,
    departmentId: input.departmentId ? new ObjectId(input.departmentId) : null,
    description: input.description,
    endsAt: input.endsAt,
    eventType: input.eventType,
    inviteePlatformUserIds: input.inviteePlatformUserIds.map((id) => new ObjectId(id)),
    location: input.location,
    meetingUrl: input.meetingUrl,
    organizerPlatformUserId: new ObjectId(actor.platformUserId),
    startsAt: input.startsAt,
    status: "active",
    timezone: "America/Costa_Rica",
    title: input.title,
    updatedAt: now,
    visibility: input.visibility,
  };

  const client = await getMongoClient();
  await client.withSession(async (session) => {
    await session.withTransaction(async () => {
      await events.insertOne(document, { session });
      await recordCalendarAudit({
        action: "event_created",
        actorPlatformUserId: actor.platformUserId,
        changedFields: [
          "eventType",
          "title",
          "description",
          "startsAt",
          "endsAt",
          "visibility",
          "inviteePlatformUserIds",
        ],
        session,
        targetEventId: document._id.toHexString(),
      });
    });
  });

  return toCalendarEvent(document);
}

async function findManageableEvent(
  events: Collection<CalendarEventDocument>,
  actor: CalendarActor,
  eventId: string,
) {
  if (!ObjectId.isValid(eventId)) {
    throw new CalendarDomainError("event_not_found");
  }
  const document = await events.findOne({
    _id: new ObjectId(eventId),
    status: "active",
  });
  if (!document) throw new CalendarDomainError("event_not_found");
  const event = toCalendarEvent(document);
  if (!canManageCalendarEvent(actor, event)) {
    throw new CalendarDomainError("event_forbidden");
  }
  return event;
}

export async function updateCalendarEvent({
  actor,
  eventId,
  input,
}: {
  actor: CalendarActor;
  eventId: string;
  input: NormalizedCalendarEventInput;
}) {
  await ensureCalendarIndexes();
  const { events } = await getCalendarCollections();
  const existing = await findManageableEvent(events, actor, eventId);
  await validateTargets(input, actor);

  if (
    actor.role === "supervisor" &&
    existing.organizerPlatformUserId !== actor.platformUserId &&
    (input.visibility !== "department" || input.departmentId !== actor.departmentId)
  ) {
    throw new CalendarDomainError("event_forbidden");
  }

  const client = await getMongoClient();
  const document = await client.withSession(async (session) => {
    let updated: CalendarEventDocument | null = null;
    await session.withTransaction(async () => {
      updated = await events.findOneAndUpdate(
        { _id: new ObjectId(eventId), status: "active" },
        {
          $set: {
            allDay: input.allDay,
            departmentId: input.departmentId ? new ObjectId(input.departmentId) : null,
            description: input.description,
            endsAt: input.endsAt,
            eventType: input.eventType,
            inviteePlatformUserIds: input.inviteePlatformUserIds.map(
              (id) => new ObjectId(id),
            ),
            location: input.location,
            meetingUrl: input.meetingUrl,
            startsAt: input.startsAt,
            title: input.title,
            updatedAt: new Date(),
            visibility: input.visibility,
          },
        },
        { returnDocument: "after", session },
      );
      if (!updated) throw new CalendarDomainError("event_not_found");

      await recordCalendarAudit({
        action: "event_updated",
        actorPlatformUserId: actor.platformUserId,
        changedFields: [
          "title",
          "eventType",
          "description",
          "startsAt",
          "endsAt",
          "visibility",
          "departmentId",
          "inviteePlatformUserIds",
          "location",
          "meetingUrl",
        ],
        session,
        targetEventId: eventId,
      });
    });
    return updated;
  });
  if (!document) throw new CalendarDomainError("event_not_found");

  return toCalendarEvent(document);
}

export async function deleteCalendarEvent({
  actor,
  eventId,
}: {
  actor: CalendarActor;
  eventId: string;
}) {
  await ensureCalendarIndexes();
  const { events } = await getCalendarCollections();
  await findManageableEvent(events, actor, eventId);
  const now = new Date();
  const client = await getMongoClient();
  await client.withSession(async (session) => {
    await session.withTransaction(async () => {
      const document = await events.findOneAndUpdate(
        { _id: new ObjectId(eventId), status: "active" },
        {
          $set: {
            deletedAt: now,
            deletedByPlatformUserId: new ObjectId(actor.platformUserId),
            status: "deleted",
            updatedAt: now,
          },
        },
        { returnDocument: "after", session },
      );
      if (!document) throw new CalendarDomainError("event_not_found");

      await recordCalendarAudit({
        action: "event_deleted",
        actorPlatformUserId: actor.platformUserId,
        changedFields: ["status", "deletedAt"],
        session,
        targetEventId: eventId,
      });
    });
  });
}

export async function listCalendarEventTargetOptions(
  actor: CalendarActor,
): Promise<CalendarEventTargetOptions> {
  await ensureCalendarIndexes();
  const { departments, employees, platformUsers } = await getCalendarCollections();
  const [departmentDocuments, employeeProfiles] = await Promise.all([
    departments
      .find({
        status: "active",
        ...(actor.role === "supervisor"
          ? actor.departmentId
            ? { _id: new ObjectId(actor.departmentId) }
            : { _id: { $exists: false } }
          : {}),
      })
      .sort({ name: 1 })
      .toArray(),
    employees
      .find(
        { employmentStatus: "active" },
        {
          projection: {
            firstSurname: 1,
            givenNames: 1,
            platformUserId: 1,
            preferredName: 1,
            secondSurname: 1,
          },
        },
      )
      .toArray(),
  ]);
  const people = await platformUsers
    .find(
      {
        _id: {
          $in: employeeProfiles.map((employee) => employee.platformUserId),
          $ne: new ObjectId(actor.platformUserId),
        },
        status: { $in: ["active", "invited"] },
      },
      { projection: { displayName: 1 } },
    )
    .toArray();
  const preferredNames = new Map(
    employeeProfiles.map((employee) => [
      employee.platformUserId.toHexString(),
      formatEmployeePreferredDisplayName(employee),
    ]),
  );

  return {
    departments: departmentDocuments.map((department) => ({
      id: department._id.toHexString(),
      name: department.name,
    })),
    people: people
      .map((person) => ({
        displayName: preferredNames.get(person._id.toHexString()) ?? person.displayName,
        id: person._id.toHexString(),
      }))
      .sort((left, right) =>
        left.displayName.localeCompare(right.displayName, "es", {
          sensitivity: "base",
        }),
      ),
  };
}

export async function listUpcomingCalendarEventNotifications({
  limit = 5,
  platformUserId,
}: {
  limit?: number;
  platformUserId: string;
}): Promise<CalendarEventNotification[]> {
  await ensureCalendarIndexes();
  const { events } = await getCalendarCollections();
  const documents = await events
    .find({
      endsAt: { $gt: new Date() },
      inviteePlatformUserIds: new ObjectId(platformUserId),
      status: "active",
    })
    .sort({ startsAt: 1 })
    .limit(limit)
    .toArray();

  return documents.map((document) => {
    const event = toCalendarEvent(document);
    return {
      allDay: event.allDay,
      endDate: event.endDate,
      endsAt: event.endsAt,
      eventType: event.eventType,
      id: event.id,
      startDate: event.startDate,
      startsAt: event.startsAt,
      title: event.title,
    };
  });
}
