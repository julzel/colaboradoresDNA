import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const repositorySource = readFileSync(
  resolve(webRoot, "src/features/scheduling/server/schedule-repository.ts"),
  "utf8",
);
const serviceSource = readFileSync(
  resolve(webRoot, "src/features/scheduling/server/scheduler-service.ts"),
  "utf8",
);
const legacyScheduleRepositorySource = readFileSync(
  resolve(webRoot, "src/features/employees/server/schedule-repository.ts"),
  "utf8",
);
const legacyEmployeeReadSource = readFileSync(
  resolve(webRoot, "src/features/employees/server/employee-read-repository.ts"),
  "utf8",
);

function sourceBetween(startMarker: string, endMarker: string) {
  const start = repositorySource.indexOf(startMarker);
  const end = repositorySource.indexOf(endMarker, start);

  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return repositorySource.slice(start, end);
}

describe("scheduling repository contracts", () => {
  it("serializes timeline writes with an employee-specific transactional lock", () => {
    const lockSource = sourceBetween(
      "async function acquireScheduleLock",
      "async function ensureScheduleLockExists",
    );
    const insertSource = sourceBetween(
      "async function insertScheduleInTransaction",
      "export async function createScheduleInSession",
    );
    const createSource = sourceBetween(
      "export async function createSchedule(",
      "function previousCalendarDate",
    );
    const replaceSource = sourceBetween(
      "export async function replaceSchedule(",
      "export async function findEffectiveSchedule",
    );

    expect(lockSource).toContain("`schedule:${employeeId}`");
    expect(lockSource).toContain("$inc: { version: 1 }");
    expect(lockSource).toContain("{ session, upsert: true }");
    expect(insertSource).toContain("acquireScheduleLock");
    expect(insertSource).toContain("schedules.insertOne(document, { session })");
    expect(createSource).toContain("session.withTransaction");
    expect(replaceSource).toContain("session.withTransaction");
    expect(replaceSource).toContain("await acquireScheduleLock");
    expect(replaceSource).toContain("lockAcquired: true");
    expect(replaceSource).toContain("{ session }");
  });

  it("checks effective-period overlap inside the write transaction", () => {
    const overlapSource = sourceBetween(
      "function overlapFilter",
      "function scheduleError",
    );
    const insertSource = sourceBetween(
      "async function insertScheduleInTransaction",
      "export async function createScheduleInSession",
    );

    expect(overlapSource).toContain("employeeId: objectId(schedule.employeeId)");
    expect(overlapSource).toContain("effectiveFrom: { $lte: schedule.effectiveTo }");
    expect(overlapSource).toContain("{ effectiveTo: null }");
    expect(overlapSource).toContain(
      "{ effectiveTo: { $gte: schedule.effectiveFrom } }",
    );
    expect(insertSource).toContain(
      "schedules.findOne(overlapFilter(input), { session })",
    );
    expect(insertSource.indexOf("findOne(overlapFilter(input)")).toBeLessThan(
      insertSource.indexOf("insertOne(document"),
    );
  });

  it("loads every schedule intersecting an inclusive calculation range", () => {
    const rangeSource = repositorySource.slice(
      repositorySource.indexOf("export async function listSchedulesOverlappingRange"),
    );

    expect(rangeSource).toContain("effectiveFrom: { $lte: parsedEndDate }");
    expect(rangeSource).toContain("employeeId: objectId(employeeId)");
    expect(rangeSource).toContain("{ effectiveTo: null }");
    expect(rangeSource).toContain("{ effectiveTo: { $gte: parsedStartDate } }");
    expect(rangeSource).toContain(".sort({ effectiveFrom: 1 })");
  });

  it("fails closed instead of choosing one overlapping effective schedule", () => {
    const readSource = sourceBetween(
      "export async function findEffectiveSchedule",
      "export async function listScheduleHistory",
    );

    expect(readSource).toContain(".limit(2)");
    expect(readSource).toContain('"overlapping_schedule_coverage"');
  });

  it("keeps index administration out of runtime repository and service paths", () => {
    for (const source of [repositorySource, serviceSource]) {
      expect(source).not.toContain("createIndex(");
      expect(source).not.toContain("applySchedulingIndexesForMigration");
      expect(source).not.toContain("scheduling-indexes");
    }
  });

  it("keeps transitional v1 readers from consuming or downgrading v2 records", () => {
    expect(legacyScheduleRepositorySource).toContain("version: { $ne: 2 }");
    expect(legacyEmployeeReadSource).toContain("version: { $ne: 2 }");
    expect(legacyScheduleRepositorySource).toContain(
      'EmployeeDomainError("schedule_managed_by_scheduler")',
    );
  });

  it("truncates open and bounded schedule coverage through the lifecycle lock", () => {
    const lifecycleSource = repositorySource.slice(
      repositorySource.indexOf(
        "export async function closeSchedulesForEmploymentEndInSession",
      ),
    );

    expect(lifecycleSource).toContain("await acquireScheduleLock");
    expect(lifecycleSource).toContain("{ effectiveTo: null }");
    expect(lifecycleSource).toContain("{ effectiveTo: { $gt: parsedDate } }");
    expect(lifecycleSource).toContain("{ $set: { effectiveTo: parsedDate } }");
    expect(lifecycleSource).toContain("recordScheduleAudit");
  });
});
