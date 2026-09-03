import "server-only";

import type { Db, IndexDescription } from "mongodb";

export const schedulingIndexDefinitions = {
  employee_schedules: [
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
  ],
} as const satisfies Readonly<Record<string, readonly IndexDescription[]>>;

/**
 * Bootstrap/migration helper only. Runtime repositories intentionally do not
 * require index-administration privileges.
 */
export async function applySchedulingIndexesForMigration(database: Db) {
  await Promise.all(
    Object.entries(schedulingIndexDefinitions).flatMap(([collectionName, indexes]) =>
      indexes.map((index) =>
        database.collection(collectionName).createIndex(index.key, index),
      ),
    ),
  );
}
