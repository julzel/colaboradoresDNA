import "server-only";

import {
  MongoServerError,
  ObjectId,
  type Collection,
  type ClientSession,
} from "mongodb";

import {
  employeeSelfServiceProfileInputSchema,
  employeeInputSchema,
  formatEmployeeBirthday,
  formatEmployeeDisplayName,
  maskIdentification,
  toEmployee,
  type Employee,
  type EmployeeDocument,
  type EmployeeInput,
  type EmployeeSelfServiceProfileInput,
  type NormalizedEmployeeInput,
} from "@/features/employees/domain/employee";
import { EmployeeDomainError } from "@/features/employees/domain/errors";
import { objectIdStringSchema } from "@/features/employees/domain/shared";
import { recordEmployeeAudit } from "@/features/employees/server/employee-audit-repository";
import { ensureEmployeeDomainIndexes } from "@/features/employees/server/employee-indexes";
import type { PlatformRole } from "@/features/auth/domain/platform-user";
import type { PlatformUserDocument } from "@/features/auth/domain/platform-user";
import { getDatabase, getMongoClient } from "@/lib/server/mongodb";

export type EmployeeDirectoryEntry = {
  displayName: string;
  employmentStatus: EmployeeDocument["employmentStatus"];
  id: string;
  maskedIdentification: string;
};

export type BirthdayCalendarEntry = {
  birthday: string;
  displayName: string;
  employeeId: string;
};

async function getEmployeesCollection(): Promise<Collection<EmployeeDocument>> {
  const database = await getDatabase();
  return database.collection<EmployeeDocument>("employees");
}

function createEmployeeDocument(
  employee: NormalizedEmployeeInput,
  now = new Date(),
): EmployeeDocument {
  return {
    _id: new ObjectId(),
    birthDay: employee.birthDay,
    birthMonth: employee.birthMonth,
    createdAt: now,
    employmentEndedOn: employee.employmentEndedOn ?? null,
    employmentStartedOn: employee.employmentStartedOn,
    employmentStatus: employee.employmentStatus,
    firstSurname: employee.firstSurname,
    givenNames: employee.givenNames,
    identification: employee.identification,
    phoneNumber: employee.phoneNumber,
    platformUserId: new ObjectId(employee.platformUserId),
    secondSurname: employee.secondSurname,
    shareBirthdayOnCalendar: employee.shareBirthdayOnCalendar,
    updatedAt: now,
  };
}

export async function createEmployee(
  input: EmployeeInput,
  { session }: { session?: ClientSession } = {},
): Promise<Employee> {
  const employee = employeeInputSchema.parse(input);
  await ensureEmployeeDomainIndexes();
  const database = await getDatabase();
  const platformUser = await database
    .collection<PlatformUserDocument>("platform_users")
    .findOne(
      {
        _id: new ObjectId(employee.platformUserId),
        status: { $in: ["active", "invited"] },
      },
      session ? { session } : undefined,
    );

  if (!platformUser) {
    throw new EmployeeDomainError("platform_user_missing");
  }

  const collection = database.collection<EmployeeDocument>("employees");
  const document = createEmployeeDocument(employee);

  try {
    await collection.insertOne(document, session ? { session } : undefined);
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new EmployeeDomainError("employee_exists");
    }

    throw error;
  }

  return toEmployee(document);
}

export async function findEmployeeById(id: string): Promise<Employee | null> {
  objectIdStringSchema.parse(id);
  await ensureEmployeeDomainIndexes();
  const collection = await getEmployeesCollection();
  const document = await collection.findOne({ _id: new ObjectId(id) });

  return document ? toEmployee(document) : null;
}

export async function findEmployeeByPlatformUserId(
  platformUserId: string,
): Promise<Employee | null> {
  objectIdStringSchema.parse(platformUserId);
  await ensureEmployeeDomainIndexes();
  const collection = await getEmployeesCollection();
  const document = await collection.findOne({
    platformUserId: new ObjectId(platformUserId),
  });

  return document ? toEmployee(document) : null;
}

export async function listEmployeeDirectory(): Promise<EmployeeDirectoryEntry[]> {
  await ensureEmployeeDomainIndexes();
  const collection = await getEmployeesCollection();
  const documents = await collection
    .find(
      {},
      {
        projection: {
          employmentStatus: 1,
          firstSurname: 1,
          givenNames: 1,
          identification: 1,
          secondSurname: 1,
        },
      },
    )
    .sort({ employmentStatus: 1, firstSurname: 1, secondSurname: 1, givenNames: 1 })
    .toArray();

  return documents.map((document) => ({
    displayName: formatEmployeeDisplayName(document),
    employmentStatus: document.employmentStatus,
    id: document._id.toHexString(),
    maskedIdentification: maskIdentification(document.identification),
  }));
}

export async function listBirthdayCalendarEntries({
  viewerRole,
}: {
  viewerRole: PlatformRole;
}): Promise<BirthdayCalendarEntry[]> {
  await ensureEmployeeDomainIndexes();
  const collection = await getEmployeesCollection();
  const documents = await collection
    .find(
      {
        employmentStatus: "active",
        ...(viewerRole === "administrator" ? {} : { shareBirthdayOnCalendar: true }),
      },
      {
        projection: {
          birthDay: 1,
          birthMonth: 1,
          firstSurname: 1,
          givenNames: 1,
          secondSurname: 1,
        },
      },
    )
    .sort({ birthMonth: 1, birthDay: 1, firstSurname: 1 })
    .toArray();

  return documents.map((document) => ({
    birthday: formatEmployeeBirthday(document),
    displayName: formatEmployeeDisplayName(document),
    employeeId: document._id.toHexString(),
  }));
}

export async function updateEmployeeSelfServiceProfile({
  actorPlatformUserId,
  input,
}: {
  actorPlatformUserId: string;
  input: EmployeeSelfServiceProfileInput;
}) {
  objectIdStringSchema.parse(actorPlatformUserId);
  const profile = employeeSelfServiceProfileInputSchema.parse(input);
  await ensureEmployeeDomainIndexes();
  const client = await getMongoClient();
  const database = await getDatabase();
  const collection = database.collection<EmployeeDocument>("employees");

  return client.withSession(async (session) => {
    let employee: Employee | null = null;

    await session.withTransaction(async () => {
      const existing = await collection.findOne(
        { platformUserId: new ObjectId(actorPlatformUserId) },
        { session },
      );

      if (!existing) {
        throw new EmployeeDomainError("employee_not_found");
      }

      const document = await collection.findOneAndUpdate(
        { _id: existing._id },
        {
          $set: {
            phoneNumber: profile.phoneNumber,
            shareBirthdayOnCalendar: profile.shareBirthdayOnCalendar,
            updatedAt: new Date(),
          },
        },
        { returnDocument: "after", session },
      );

      if (!document) {
        throw new EmployeeDomainError("employee_not_found");
      }

      employee = toEmployee(document);

      if (
        existing.phoneNumber?.normalizedValue !== profile.phoneNumber?.normalizedValue
      ) {
        await recordEmployeeAudit({
          action: "phone_number_updated",
          actorPlatformUserId,
          changedFields: ["phoneNumber"],
          session,
          targetEmployeeId: document._id.toHexString(),
        });
      }

      if (existing.shareBirthdayOnCalendar !== profile.shareBirthdayOnCalendar) {
        await recordEmployeeAudit({
          action: "birthday_sharing_updated",
          actorPlatformUserId,
          changedFields: ["shareBirthdayOnCalendar"],
          session,
          targetEmployeeId: document._id.toHexString(),
        });
      }
    });

    return employee;
  });
}
