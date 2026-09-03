import { isDeepStrictEqual } from "node:util";

import { MongoClient, ServerApiVersion } from "mongodb";
import { z } from "zod";

const environmentSchema = z.object({
  MONGODB_DB: z.string().min(1),
  MONGODB_URI: z.string().url().startsWith("mongodb"),
});

const collectionName = "employee_schedules";
const isoDatePattern = "^\\d{4}-\\d{2}-\\d{2}$";
const clockTimePattern = "^(?:[01]\\d|2[0-3]):[0-5]\\d$";
const weekdays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function isValidIsoDate(value) {
  if (!new RegExp(isoDatePattern).test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const canonicalDateSchema = z.string().refine(isValidIsoDate);

const canonicalShiftSchema = z
  .object({
    dayOfWeek: z.enum(weekdays),
    endTime: z.string().regex(new RegExp(clockTimePattern)),
    startTime: z.string().regex(new RegExp(clockTimePattern)),
  })
  .refine((shift) => shift.endTime > shift.startTime);
const canonicalWeekSchema = z
  .object({ shifts: z.array(canonicalShiftSchema).max(7) })
  .refine(
    (week) =>
      new Set(week.shifts.map((shift) => shift.dayOfWeek)).size === week.shifts.length,
  );
const canonicalSchedulePreflightSchema = z
  .object({
    anchorDate: canonicalDateSchema,
    effectiveFrom: canonicalDateSchema,
    effectiveTo: z.union([z.null(), canonicalDateSchema]),
    version: z.literal(2),
    weeks: z.union([
      z.tuple([canonicalWeekSchema]),
      z.tuple([canonicalWeekSchema, canonicalWeekSchema]),
    ]),
  })
  .refine(
    (schedule) =>
      schedule.effectiveTo === null || schedule.effectiveTo >= schedule.effectiveFrom,
  )
  .refine((schedule) => {
    const anchor = new Date(`${schedule.anchorDate}T00:00:00.000Z`);
    return (
      !Number.isNaN(anchor.getTime()) &&
      anchor.toISOString().slice(0, 10) === schedule.anchorDate &&
      anchor.getUTCDay() === 1
    );
  })
  .refine((schedule) => schedule.weeks.some((week) => week.shifts.length > 0));

// Keep these definitions synchronized with
// src/features/scheduling/server/scheduling-indexes.ts. This migration-only
// script owns schema/index administration; runtime credentials do not need it.
const scheduleIndexes = [
  {
    key: { employeeId: 1, effectiveFrom: -1, effectiveTo: 1 },
    name: "employee_schedules_employee_timeline",
  },
  {
    key: { employeeId: 1 },
    name: "employee_schedules_one_open_period",
    partialFilterExpression: { effectiveTo: null },
    unique: true,
  },
];

const nullableIsoDateSchema = {
  oneOf: [{ bsonType: "null" }, { bsonType: "string", pattern: isoDatePattern }],
};

const commonScheduleProperties = {
  _id: { bsonType: "objectId" },
  createdAt: { bsonType: "date" },
  createdByPlatformUserId: { bsonType: "objectId" },
  effectiveFrom: { bsonType: "string", pattern: isoDatePattern },
  effectiveTo: nullableIsoDateSchema,
  employeeId: { bsonType: "objectId" },
  timezone: { enum: ["America/Costa_Rica"] },
};

const commonRequiredProperties = [
  "_id",
  "createdAt",
  "createdByPlatformUserId",
  "effectiveFrom",
  "effectiveTo",
  "employeeId",
  "timezone",
];

const v2DocumentSchema = {
  bsonType: "object",
  properties: {
    ...commonScheduleProperties,
    anchorDate: { bsonType: "string", pattern: isoDatePattern },
    version: { enum: [2] },
    weeks: {
      bsonType: "array",
      items: {
        bsonType: "object",
        properties: {
          shifts: {
            bsonType: "array",
            items: {
              bsonType: "object",
              properties: {
                dayOfWeek: { enum: weekdays },
                endTime: { bsonType: "string", pattern: clockTimePattern },
                startTime: { bsonType: "string", pattern: clockTimePattern },
              },
              required: ["dayOfWeek", "endTime", "startTime"],
            },
            maxItems: 7,
          },
        },
        required: ["shifts"],
      },
      maxItems: 2,
      minItems: 1,
    },
  },
  required: [...commonRequiredProperties, "anchorDate", "version", "weeks"],
};

const legacyDocumentSchema = {
  bsonType: "object",
  properties: {
    ...commonScheduleProperties,
    days: {
      bsonType: "array",
      items: {
        bsonType: "object",
        properties: {
          dayOfWeek: { enum: weekdays },
          halfDayPeriod: { enum: ["morning", "afternoon", null] },
          workFraction: { enum: [0, 0.5, 1] },
        },
        required: ["dayOfWeek", "workFraction"],
      },
      maxItems: 7,
      minItems: 7,
    },
    // Missing version is the original legacy representation. An explicit 1 is
    // also accepted during the dual-read transition.
    version: { enum: [1] },
  },
  required: [...commonRequiredProperties, "days"],
};

const scheduleValidator = {
  $or: [
    {
      $and: [
        { $jsonSchema: v2DocumentSchema },
        {
          $expr: {
            $eq: [
              {
                $isoDayOfWeek: {
                  $dateFromString: {
                    dateString: "$anchorDate",
                    format: "%Y-%m-%d",
                    onError: null,
                    onNull: null,
                    timezone: "UTC",
                  },
                },
              },
              1,
            ],
          },
        },
      ],
    },
    { $jsonSchema: legacyDocumentSchema },
  ],
};

function comparableIndex(index) {
  return {
    key: index.key,
    partialFilterExpression: index.partialFilterExpression ?? null,
    unique: index.unique === true,
  };
}

async function reconcileIndex(collection, definition) {
  const currentIndexes = await collection.indexes();
  const expected = comparableIndex(definition);
  const conflicts = currentIndexes.filter(
    (index) =>
      index.name === definition.name || isDeepStrictEqual(index.key, definition.key),
  );
  const exactMatch = conflicts.find(
    (index) =>
      index.name === definition.name &&
      isDeepStrictEqual(comparableIndex(index), expected),
  );

  if (exactMatch && conflicts.length === 1) return;

  for (const conflict of conflicts) {
    if (conflict.name && conflict.name !== "_id_") {
      await collection.dropIndex(conflict.name);
    }
  }

  const { key, ...options } = definition;
  await collection.createIndex(key, options);
}

async function ensureScheduleCollection(database) {
  const exists = await database
    .listCollections({ name: collectionName }, { nameOnly: true })
    .hasNext();

  if (!exists) await database.createCollection(collectionName);
  return database.collection(collectionName);
}

async function assertSafeScheduleState(collection) {
  const duplicateOpenSchedule = await collection
    .aggregate([
      { $match: { effectiveTo: null } },
      { $group: { _id: "$employeeId", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: 1 },
    ])
    .hasNext();

  if (duplicateOpenSchedule) {
    throw new Error("Duplicate open schedule periods must be resolved first.");
  }

  const canonicalSchedules = collection.find(
    { version: 2 },
    {
      projection: {
        anchorDate: 1,
        effectiveFrom: 1,
        effectiveTo: 1,
        version: 1,
        weeks: 1,
      },
    },
  );

  for await (const schedule of canonicalSchedules) {
    if (!canonicalSchedulePreflightSchema.safeParse(schedule).success) {
      throw new Error("Invalid canonical schedule data must be resolved first.");
    }
  }

  const timelines = collection
    .find({}, { projection: { effectiveFrom: 1, effectiveTo: 1, employeeId: 1 } })
    .sort({ employeeId: 1, effectiveFrom: 1 });
  let previous = null;

  for await (const schedule of timelines) {
    if (
      previous?.employeeId?.equals(schedule.employeeId) &&
      (previous.effectiveTo === null || schedule.effectiveFrom <= previous.effectiveTo)
    ) {
      throw new Error("Overlapping schedule periods must be resolved first.");
    }

    previous = schedule;
  }
}

async function bootstrap() {
  const environment = environmentSchema.parse(process.env);
  const client = new MongoClient(environment.MONGODB_URI, {
    serverApi: {
      deprecationErrors: true,
      strict: true,
      version: ServerApiVersion.v1,
    },
  });

  try {
    await client.connect();
    const database = client.db(environment.MONGODB_DB);
    const schedules = await ensureScheduleCollection(database);

    // Validate rebuild preconditions before a conflicting index can be dropped.
    await assertSafeScheduleState(schedules);

    for (const index of scheduleIndexes) {
      await reconcileIndex(schedules, index);
    }

    await database.command({
      collMod: collectionName,
      validationAction: "error",
      validationLevel: "moderate",
      validator: scheduleValidator,
    });

    console.info("El modelo de horarios de colaboradores quedó listo.");
  } finally {
    await client.close();
  }
}

bootstrap().catch(() => {
  console.error(
    "La inicialización de horarios falló de forma segura. Revisá la conexión a la base de datos.",
  );
  process.exitCode = 1;
});
