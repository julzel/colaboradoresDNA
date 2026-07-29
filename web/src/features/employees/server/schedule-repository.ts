import "server-only";

import {
  MongoServerError,
  ObjectId,
  type ClientSession,
  type Collection,
  type Filter,
} from "mongodb";

import type { EmployeeDocument } from "@/features/employees/domain/employee";
import { EmployeeDomainError } from "@/features/employees/domain/errors";
import {
  employeeScheduleInputSchema,
  toEmployeeSchedule,
  type EmployeeSchedule,
  type EmployeeScheduleDocument,
  type EmployeeScheduleInput,
  type NormalizedEmployeeScheduleInput,
} from "@/features/employees/domain/schedule";
import {
  isoCalendarDateSchema,
  objectIdStringSchema,
  previousIsoCalendarDate,
} from "@/features/employees/domain/shared";
import { recordEmployeeAudit } from "@/features/employees/server/employee-audit-repository";
import { ensureEmployeeDomainIndexes } from "@/features/employees/server/employee-indexes";
import { getDatabase, getMongoClient } from "@/lib/server/mongodb";

type TimelineLockDocument = {
  _id: string;
  updatedAt: Date;
  version: number;
};

async function getScheduleCollections() {
  const database = await getDatabase();

  return {
    employees: database.collection<EmployeeDocument>("employees"),
    locks: database.collection<TimelineLockDocument>("employee_timeline_locks"),
    schedules: database.collection<EmployeeScheduleDocument>("employee_schedules"),
  };
}

function getOverlapFilter(
  schedule: NormalizedEmployeeScheduleInput,
  excludedId?: ObjectId,
): Filter<EmployeeScheduleDocument> {
  return {
    employeeId: new ObjectId(schedule.employeeId),
    ...(excludedId ? { _id: { $ne: excludedId } } : {}),
    ...(schedule.effectiveTo ? { effectiveFrom: { $lte: schedule.effectiveTo } } : {}),
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: schedule.effectiveFrom } }],
  };
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
  const { locks } = await getScheduleCollections();

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
  input: NormalizedEmployeeScheduleInput;
  lockAcquired?: boolean;
  session: ClientSession;
}) {
  const { employees, locks, schedules } = await getScheduleCollections();

  if (!lockAcquired) {
    await acquireScheduleLock({ employeeId: input.employeeId, locks, session });
  }

  const employee = await employees.findOne(
    { _id: new ObjectId(input.employeeId) },
    { session },
  );

  if (!employee) {
    throw new EmployeeDomainError("employee_not_found");
  }

  const overlap = await schedules.findOne(getOverlapFilter(input), { session });

  if (overlap) {
    throw new EmployeeDomainError("schedule_overlap");
  }

  const document: EmployeeScheduleDocument = {
    _id: new ObjectId(),
    createdAt: new Date(),
    createdByPlatformUserId: new ObjectId(input.createdByPlatformUserId),
    days: input.days,
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo ?? null,
    employeeId: new ObjectId(input.employeeId),
    timezone: input.timezone,
  };

  await schedules.insertOne(document, { session });
  await recordEmployeeAudit({
    action: "schedule_created",
    actorPlatformUserId: input.createdByPlatformUserId,
    changedFields: ["schedule"],
    session,
    targetEmployeeId: input.employeeId,
  });

  return toEmployeeSchedule(document);
}

export async function createEmployeeScheduleInSession(
  input: EmployeeScheduleInput,
  session: ClientSession,
) {
  const schedule = employeeScheduleInputSchema.parse(input);
  return insertScheduleInTransaction({ input: schedule, session });
}

export async function createEmployeeSchedule(
  input: EmployeeScheduleInput,
): Promise<EmployeeSchedule> {
  const schedule = employeeScheduleInputSchema.parse(input);
  await ensureEmployeeDomainIndexes();
  await ensureScheduleLockExists(schedule.employeeId);
  const client = await getMongoClient();

  return client.withSession(async (session) => {
    let created: EmployeeSchedule | null = null;

    await session.withTransaction(async () => {
      created = await createEmployeeScheduleInSession(schedule, session);
    });

    if (!created) {
      throw new EmployeeDomainError("employee_not_found");
    }

    return created;
  });
}

export async function replaceEmployeeSchedule(
  input: Omit<EmployeeScheduleInput, "effectiveTo">,
): Promise<EmployeeSchedule> {
  const schedule = employeeScheduleInputSchema.parse({
    ...input,
    effectiveTo: null,
  });
  await ensureEmployeeDomainIndexes();
  await ensureScheduleLockExists(schedule.employeeId);
  const client = await getMongoClient();
  const { locks, schedules } = await getScheduleCollections();

  return client.withSession(async (session) => {
    let created: EmployeeSchedule | null = null;

    await session.withTransaction(async () => {
      await acquireScheduleLock({
        employeeId: schedule.employeeId,
        locks,
        session,
      });
      const openSchedule = await schedules.findOne(
        { employeeId: new ObjectId(schedule.employeeId), effectiveTo: null },
        { session },
      );

      if (openSchedule) {
        if (openSchedule.effectiveFrom >= schedule.effectiveFrom) {
          throw new EmployeeDomainError("schedule_overlap");
        }

        await schedules.updateOne(
          { _id: openSchedule._id },
          {
            $set: {
              effectiveTo: previousIsoCalendarDate(schedule.effectiveFrom),
            },
          },
          { session },
        );
        await recordEmployeeAudit({
          action: "schedule_closed",
          actorPlatformUserId: schedule.createdByPlatformUserId,
          changedFields: ["schedule"],
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

    if (!created) {
      throw new EmployeeDomainError("employee_not_found");
    }

    return created;
  });
}

export async function findEffectiveEmployeeSchedule({
  employeeId,
  onDate,
}: {
  employeeId: string;
  onDate: string;
}) {
  objectIdStringSchema.parse(employeeId);
  isoCalendarDateSchema.parse(onDate);
  await ensureEmployeeDomainIndexes();
  const { schedules } = await getScheduleCollections();
  const document = await schedules.findOne(
    {
      employeeId: new ObjectId(employeeId),
      effectiveFrom: { $lte: onDate },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gte: onDate } }],
    },
    { sort: { effectiveFrom: -1 } },
  );

  return document ? toEmployeeSchedule(document) : null;
}

export async function listEmployeeScheduleHistory(employeeId: string) {
  objectIdStringSchema.parse(employeeId);
  await ensureEmployeeDomainIndexes();
  const { schedules } = await getScheduleCollections();
  const documents = await schedules
    .find({ employeeId: new ObjectId(employeeId) })
    .sort({ effectiveFrom: -1 })
    .toArray();

  return documents.map(toEmployeeSchedule);
}
