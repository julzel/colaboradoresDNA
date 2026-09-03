import "server-only";

import {
  MongoServerError,
  ObjectId,
  type ClientSession,
  type Collection,
  type Filter,
} from "mongodb";

import { schedulingEmployeeIntegration } from "@/features/employees/integrations/scheduling-employee-adapter";
import {
  normalizeLegacyScheduleV1,
  scheduleDateSchema,
  scheduleV2RecordSchema,
  scheduleWriteInputSchema,
  SchedulingDomainError,
  type LegacyScheduleDay,
  type NormalizedScheduleWriteInput,
  type ScheduleRecord,
  type ScheduleV2,
  type ScheduleWeek,
  type ScheduleWriteInput,
} from "@/features/scheduling/domain/schedule";
import { getDatabase, getMongoClient } from "@/lib/server/mongodb";

type ScheduleTimelineDocument = {
  _id: ObjectId;
  anchorDate?: string;
  createdAt: Date;
  createdByPlatformUserId: ObjectId;
  days?: LegacyScheduleDay[];
  effectiveFrom: string;
  effectiveTo: string | null;
  employeeId: ObjectId;
  timezone: "America/Costa_Rica";
  version?: 1 | 2;
  weeks?: ScheduleWeek[];
};

type TimelineLockDocument = {
  _id: string;
  updatedAt: Date;
  version: number;
};

async function getSchedulingCollections() {
  const database = await getDatabase();

  return {
    locks: database.collection<TimelineLockDocument>("employee_timeline_locks"),
    schedules: database.collection<ScheduleTimelineDocument>("employee_schedules"),
  };
}

function objectId(value: string) {
  if (!ObjectId.isValid(value)) {
    throw new SchedulingDomainError("employee_not_found", {
      date: null,
      endDate: null,
      sourceScheduleIds: [],
      startDate: null,
    });
  }

  return new ObjectId(value);
}

function toScheduleRecord(document: ScheduleTimelineDocument): ScheduleRecord {
  const common = {
    effectiveFrom: document.effectiveFrom,
    effectiveTo: document.effectiveTo,
    employeeId: document.employeeId.toHexString(),
    id: document._id.toHexString(),
    timezone: document.timezone,
  };

  if (document.version === 2) {
    return scheduleV2RecordSchema.parse({
      ...common,
      anchorDate: document.anchorDate,
      version: 2,
      weeks: document.weeks,
    });
  }

  return normalizeLegacyScheduleV1({
    ...common,
    days: document.days ?? [],
  });
}

function overlapFilter(
  schedule: NormalizedScheduleWriteInput,
  excludedId?: ObjectId,
): Filter<ScheduleTimelineDocument> {
  return {
    employeeId: objectId(schedule.employeeId),
    ...(excludedId ? { _id: { $ne: excludedId } } : {}),
    ...(schedule.effectiveTo ? { effectiveFrom: { $lte: schedule.effectiveTo } } : {}),
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: schedule.effectiveFrom } }],
  };
}

function scheduleError(
  code: "employee_not_found" | "schedule_overlap",
  input?: { endDate?: string; startDate?: string },
) {
  return new SchedulingDomainError(code, {
    date: null,
    endDate: input?.endDate ?? null,
    sourceScheduleIds: [],
    startDate: input?.startDate ?? null,
  });
}

async function acquireScheduleLock({
  employeeId,
  locks,
  session,
}: {
  employeeId: string;
  locks: Collection<TimelineLockDocument>;
  session: ClientSession;
}) {
  await locks.updateOne(
    { _id: `schedule:${employeeId}` },
    { $inc: { version: 1 }, $set: { updatedAt: new Date() } },
    { session, upsert: true },
  );
}

async function ensureScheduleLockExists(employeeId: string) {
  const { locks } = await getSchedulingCollections();

  try {
    await locks.updateOne(
      { _id: `schedule:${employeeId}` },
      {
        $setOnInsert: {
          updatedAt: new Date(),
          version: 0,
        },
      },
      { upsert: true },
    );
  } catch (error) {
    if (!(error instanceof MongoServerError && error.code === 11000)) {
      throw error;
    }
  }
}

async function insertScheduleInTransaction({
  input,
  lockAcquired = false,
  session,
}: {
  input: NormalizedScheduleWriteInput;
  lockAcquired?: boolean;
  session: ClientSession;
}): Promise<ScheduleV2> {
  const { locks, schedules } = await getSchedulingCollections();

  if (!lockAcquired) {
    await acquireScheduleLock({ employeeId: input.employeeId, locks, session });
  }

  if (
    !(await schedulingEmployeeIntegration.employeeIsActive(input.employeeId, session))
  ) {
    throw scheduleError("employee_not_found");
  }

  const overlap = await schedules.findOne(overlapFilter(input), { session });
  if (overlap) {
    throw scheduleError("schedule_overlap", {
      ...(input.effectiveTo ? { endDate: input.effectiveTo } : {}),
      startDate: input.effectiveFrom,
    });
  }

  const document: ScheduleTimelineDocument = {
    _id: new ObjectId(),
    anchorDate: input.anchorDate,
    createdAt: new Date(),
    createdByPlatformUserId: objectId(input.createdByPlatformUserId),
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo,
    employeeId: objectId(input.employeeId),
    timezone: input.timezone,
    version: 2,
    weeks: input.weeks,
  };

  await schedules.insertOne(document, { session });
  await schedulingEmployeeIntegration.recordScheduleAudit({
    action: "schedule_created",
    actorPlatformUserId: input.createdByPlatformUserId,
    session,
    targetEmployeeId: input.employeeId,
  });

  return toScheduleRecord(document) as ScheduleV2;
}

export async function createScheduleInSession(
  input: ScheduleWriteInput,
  session: ClientSession,
) {
  const schedule = scheduleWriteInputSchema.parse(input);
  return insertScheduleInTransaction({ input: schedule, session });
}

export async function createSchedule(input: ScheduleWriteInput) {
  const schedule = scheduleWriteInputSchema.parse(input);
  objectId(schedule.employeeId);
  objectId(schedule.createdByPlatformUserId);
  await ensureScheduleLockExists(schedule.employeeId);
  const client = await getMongoClient();

  return client.withSession(async (session) => {
    let created: ScheduleV2 | null = null;

    await session.withTransaction(async () => {
      created = await insertScheduleInTransaction({ input: schedule, session });
    });

    if (!created) throw scheduleError("employee_not_found");
    return created;
  });
}

function previousCalendarDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export async function replaceSchedule(input: Omit<ScheduleWriteInput, "effectiveTo">) {
  const schedule = scheduleWriteInputSchema.parse({ ...input, effectiveTo: null });
  objectId(schedule.employeeId);
  objectId(schedule.createdByPlatformUserId);
  await ensureScheduleLockExists(schedule.employeeId);
  const client = await getMongoClient();
  const { locks, schedules } = await getSchedulingCollections();

  return client.withSession(async (session) => {
    let created: ScheduleV2 | null = null;

    await session.withTransaction(async () => {
      await acquireScheduleLock({
        employeeId: schedule.employeeId,
        locks,
        session,
      });
      const openSchedule = await schedules.findOne(
        { employeeId: objectId(schedule.employeeId), effectiveTo: null },
        { session },
      );

      if (openSchedule) {
        if (openSchedule.effectiveFrom >= schedule.effectiveFrom) {
          throw scheduleError("schedule_overlap", {
            startDate: schedule.effectiveFrom,
          });
        }

        await schedules.updateOne(
          { _id: openSchedule._id },
          { $set: { effectiveTo: previousCalendarDate(schedule.effectiveFrom) } },
          { session },
        );
        await schedulingEmployeeIntegration.recordScheduleAudit({
          action: "schedule_closed",
          actorPlatformUserId: schedule.createdByPlatformUserId,
          session,
          targetEmployeeId: schedule.employeeId,
        });
      }

      created = await insertScheduleInTransaction({
        input: schedule,
        lockAcquired: true,
        session,
      });
    });

    if (!created) throw scheduleError("employee_not_found");
    return created;
  });
}

export async function findEffectiveSchedule({
  employeeId,
  onDate,
}: {
  employeeId: string;
  onDate: string;
}) {
  const parsedDate = scheduleDateSchema.parse(onDate);
  const { schedules } = await getSchedulingCollections();
  const documents = await schedules
    .find({
      effectiveFrom: { $lte: parsedDate },
      employeeId: objectId(employeeId),
      $or: [{ effectiveTo: null }, { effectiveTo: { $gte: parsedDate } }],
    })
    .sort({ effectiveFrom: -1 })
    .limit(2)
    .toArray();

  if (documents.length > 1) {
    throw new SchedulingDomainError("overlapping_schedule_coverage", {
      date: parsedDate,
      endDate: null,
      sourceScheduleIds: documents.map((document) => document._id.toHexString()),
      startDate: null,
    });
  }

  return documents[0] ? toScheduleRecord(documents[0]) : null;
}

export async function listScheduleHistory(employeeId: string) {
  const { schedules } = await getSchedulingCollections();
  const documents = await schedules
    .find({ employeeId: objectId(employeeId) })
    .sort({ effectiveFrom: -1 })
    .toArray();

  return documents.map(toScheduleRecord);
}

export async function listSchedulesEffectiveOn(onDate: string) {
  const parsedDate = scheduleDateSchema.parse(onDate);
  const { schedules } = await getSchedulingCollections();
  const documents = await schedules
    .find({
      effectiveFrom: { $lte: parsedDate },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gte: parsedDate } }],
    })
    .sort({ employeeId: 1, effectiveFrom: -1 })
    .toArray();
  const records = documents.map(toScheduleRecord);
  const scheduleByEmployee = new Map<string, ScheduleRecord>();

  for (const record of records) {
    const existing = scheduleByEmployee.get(record.employeeId);

    if (existing) {
      throw new SchedulingDomainError("overlapping_schedule_coverage", {
        date: parsedDate,
        endDate: null,
        sourceScheduleIds: [existing.id, record.id],
        startDate: null,
      });
    }

    scheduleByEmployee.set(record.employeeId, record);
  }

  return records;
}

export async function listSchedulesOverlappingRange({
  employeeId,
  endDate,
  startDate,
}: {
  employeeId: string;
  endDate: string;
  startDate: string;
}) {
  const parsedStartDate = scheduleDateSchema.parse(startDate);
  const parsedEndDate = scheduleDateSchema.parse(endDate);

  if (parsedEndDate < parsedStartDate) {
    throw new SchedulingDomainError("invalid_range", {
      date: null,
      endDate: parsedEndDate,
      sourceScheduleIds: [],
      startDate: parsedStartDate,
    });
  }
  const { schedules } = await getSchedulingCollections();
  const documents = await schedules
    .find({
      effectiveFrom: { $lte: parsedEndDate },
      employeeId: objectId(employeeId),
      $or: [{ effectiveTo: null }, { effectiveTo: { $gte: parsedStartDate } }],
    })
    .sort({ effectiveFrom: 1 })
    .toArray();

  return documents.map(toScheduleRecord);
}

/** Transaction participant used to truncate schedule coverage when employment ends. */
export async function closeSchedulesForEmploymentEndInSession({
  actorPlatformUserId,
  employeeId,
  employmentEndedOn,
  session,
}: {
  actorPlatformUserId: string;
  employeeId: string;
  employmentEndedOn: string;
  session: ClientSession;
}) {
  const parsedDate = scheduleDateSchema.parse(employmentEndedOn);
  const { locks, schedules } = await getSchedulingCollections();

  await acquireScheduleLock({ employeeId, locks, session });
  const result = await schedules.updateMany(
    {
      effectiveFrom: { $lte: parsedDate },
      employeeId: objectId(employeeId),
      $or: [{ effectiveTo: null }, { effectiveTo: { $gt: parsedDate } }],
    },
    { $set: { effectiveTo: parsedDate } },
    { session },
  );

  if (result.modifiedCount > 0) {
    await schedulingEmployeeIntegration.recordScheduleAudit({
      action: "schedule_closed",
      actorPlatformUserId,
      session,
      targetEmployeeId: employeeId,
    });
  }
}
