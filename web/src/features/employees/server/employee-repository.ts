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
  formatEmployeePreferredDisplayName,
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
    preferredName: null,
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

export async function updateEmployeePersonalInformation({
  actorPlatformUserId,
  employeeId,
  input,
}: {
  actorPlatformUserId: string;
  employeeId: string;
  input: EmployeeInput;
}) {
  objectIdStringSchema.parse(employeeId);
  const employee = employeeInputSchema.parse(input);
  const client = await getMongoClient();
  const database = await getDatabase();

  return client.withSession(async (session) => {
    let updated: Employee | null = null;

    await session.withTransaction(async () => {
      const collection = database.collection<EmployeeDocument>("employees");
      const existing = await collection.findOne(
        { _id: new ObjectId(employeeId) },
        { session },
      );

      if (!existing) throw new EmployeeDomainError("employee_not_found");

      try {
        const document = await collection.findOneAndUpdate(
          { _id: existing._id },
          {
            $set: {
              birthDay: employee.birthDay,
              birthMonth: employee.birthMonth,
              firstSurname: employee.firstSurname,
              givenNames: employee.givenNames,
              identification: employee.identification,
              phoneNumber: employee.phoneNumber,
              secondSurname: employee.secondSurname,
              shareBirthdayOnCalendar: employee.shareBirthdayOnCalendar,
              updatedAt: new Date(),
            },
          },
          { returnDocument: "after", session },
        );

        if (!document) throw new EmployeeDomainError("employee_not_found");
        updated = toEmployee(document);
        await database.collection("platform_users").updateOne(
          { _id: document.platformUserId },
          {
            $set: {
              displayName: formatEmployeeDisplayName(document),
              updatedAt: new Date(),
            },
          },
          { session },
        );
        await recordEmployeeAudit({
          action: "personal_profile_updated",
          actorPlatformUserId,
          changedFields: [
            "birthDay",
            "birthMonth",
            "firstSurname",
            "givenNames",
            "identification",
            "phoneNumber",
            "secondSurname",
            "shareBirthdayOnCalendar",
          ],
          session,
          targetEmployeeId: employeeId,
        });
      } catch (error) {
        if (error instanceof MongoServerError && error.code === 11000) {
          throw new EmployeeDomainError("employee_exists");
        }

        throw error;
      }
    });

    return updated;
  });
}

export async function endEmployeeEmployment({
  actorPlatformUserId,
  employeeId,
  endedOn,
}: {
  actorPlatformUserId: string;
  employeeId: string;
  endedOn: string;
}) {
  objectIdStringSchema.parse(employeeId);
  const client = await getMongoClient();
  const database = await getDatabase();

  return client.withSession(async (session) => {
    let platformUserId: string | null = null;

    await session.withTransaction(async () => {
      const employee = await database
        .collection<EmployeeDocument>("employees")
        .findOne({ _id: new ObjectId(employeeId) }, { session });

      if (!employee) throw new EmployeeDomainError("employee_not_found");
      if (endedOn < employee.employmentStartedOn) {
        throw new EmployeeDomainError("employment_date_invalid");
      }

      platformUserId = employee.platformUserId.toHexString();
      await database.collection<EmployeeDocument>("employees").updateOne(
        { _id: employee._id },
        {
          $set: {
            employmentEndedOn: endedOn,
            employmentStatus: "inactive",
            updatedAt: new Date(),
          },
        },
        { session },
      );
      await Promise.all([
        database.collection("employee_assignments").updateMany(
          {
            effectiveFrom: { $lte: endedOn },
            effectiveTo: null,
            employeeId: employee._id,
          },
          { $set: { effectiveTo: endedOn } },
          { session },
        ),
        database.collection("employee_schedules").updateMany(
          {
            effectiveFrom: { $lte: endedOn },
            effectiveTo: null,
            employeeId: employee._id,
          },
          { $set: { effectiveTo: endedOn } },
          { session },
        ),
        database.collection("platform_users").updateOne(
          { _id: employee.platformUserId },
          {
            $set: {
              clerkSyncStatus: "pending_deactivation",
              deactivatedAt: new Date(),
              status: "deactivated",
              updatedAt: new Date(),
            },
          },
          { session },
        ),
      ]);
      await recordEmployeeAudit({
        action: "employment_status_updated",
        actorPlatformUserId,
        changedFields: ["employmentEndedOn", "employmentStatus"],
        session,
        targetEmployeeId: employeeId,
      });
    });

    return platformUserId;
  });
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
          preferredName: 1,
          secondSurname: 1,
        },
      },
    )
    .sort({ birthMonth: 1, birthDay: 1, firstSurname: 1 })
    .toArray();

  return documents.map((document) => ({
    birthday: formatEmployeeBirthday(document),
    displayName: formatEmployeePreferredDisplayName(document),
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
            preferredName: profile.preferredName,
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

      if ((existing.preferredName ?? null) !== profile.preferredName) {
        await recordEmployeeAudit({
          action: "preferred_name_updated",
          actorPlatformUserId,
          changedFields: ["preferredName"],
          session,
          targetEmployeeId: document._id.toHexString(),
        });
      }

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
