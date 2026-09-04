import "server-only";

import { MongoServerError, type IndexDescription } from "mongodb";

import { getDatabase } from "@/lib/server/mongodb";

const collectionIndexes: Readonly<Record<string, readonly IndexDescription[]>> = {
  departments: [
    {
      key: { normalizedName: 1 },
      name: "departments_normalized_name_unique",
      unique: true,
    },
    {
      key: { status: 1, name: 1 },
      name: "departments_directory",
    },
  ],
  employee_assignments: [
    {
      key: { employeeId: 1, effectiveFrom: -1, effectiveTo: 1 },
      name: "employee_assignments_employee_timeline",
    },
    {
      key: { departmentId: 1, effectiveFrom: -1, effectiveTo: 1 },
      name: "employee_assignments_department_timeline",
    },
    {
      key: { managerEmployeeId: 1, effectiveFrom: -1, effectiveTo: 1 },
      name: "employee_assignments_manager_timeline",
      partialFilterExpression: { managerEmployeeId: { $type: "objectId" } },
    },
    {
      key: { employeeId: 1 },
      name: "employee_assignments_one_open_period",
      partialFilterExpression: { effectiveTo: null },
      unique: true,
    },
  ],
  employee_audit: [
    {
      key: { targetEmployeeId: 1, createdAt: -1 },
      name: "employee_audit_target_timeline",
    },
    {
      key: { actorPlatformUserId: 1, createdAt: -1 },
      name: "employee_audit_actor_timeline",
    },
  ],
  employees: [
    {
      key: { employeeCode: 1 },
      name: "employees_employee_code_unique",
      partialFilterExpression: { employeeCode: { $type: "string" } },
      unique: true,
    },
    {
      key: { platformUserId: 1 },
      name: "employees_platform_user_unique",
      unique: true,
    },
    {
      key: {
        "identification.type": 1,
        "identification.normalizedValue": 1,
      },
      name: "employees_identification_unique",
      unique: true,
    },
    {
      key: {
        employmentStatus: 1,
        firstSurname: 1,
        secondSurname: 1,
        givenNames: 1,
      },
      name: "employees_directory",
    },
    {
      key: { birthMonth: 1, birthDay: 1, employmentStatus: 1 },
      name: "employees_birthday_calendar",
    },
  ],
};

declare global {
  var employeeDomainIndexesPromise: Promise<void> | undefined;
}

export async function ensureEmployeeDomainIndexes() {
  if (!globalThis.employeeDomainIndexesPromise) {
    globalThis.employeeDomainIndexesPromise = (async () => {
      const database = await getDatabase();

      await Promise.all(
        Object.entries(collectionIndexes).flatMap(([collectionName, indexes]) => {
          const collection = database.collection(collectionName);
          return indexes.map((index) => collection.createIndex(index.key, index));
        }),
      );

      try {
        await database
          .collection<{
            _id: string;
            updatedAt: Date;
            version: number;
          }>("employee_timeline_locks")
          .updateOne(
            { _id: "assignment_graph" },
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
    })();
  }

  return globalThis.employeeDomainIndexesPromise;
}
