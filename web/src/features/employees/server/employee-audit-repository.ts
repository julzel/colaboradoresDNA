import "server-only";

import { ObjectId, type Collection, type ClientSession } from "mongodb";

import { objectIdStringSchema } from "@/features/employees/domain/shared";
import { ensureEmployeeDomainIndexes } from "@/features/employees/server/employee-indexes";
import { getDatabase } from "@/lib/server/mongodb";

export type EmployeeAuditAction =
  | "assignment_closed"
  | "assignment_created"
  | "birthday_sharing_updated"
  | "employee_created"
  | "employment_status_updated"
  | "identification_updated"
  | "personal_profile_updated"
  | "phone_number_updated"
  | "schedule_closed"
  | "schedule_created";

export type EmployeeAuditField =
  | "birthDay"
  | "birthMonth"
  | "departmentId"
  | "employmentEndedOn"
  | "employmentStartedOn"
  | "employmentStatus"
  | "firstSurname"
  | "givenNames"
  | "identification"
  | "managerEmployeeId"
  | "phoneNumber"
  | "positionTitle"
  | "schedule"
  | "secondSurname"
  | "shareBirthdayOnCalendar";

type EmployeeAuditDocument = {
  _id: ObjectId;
  action: EmployeeAuditAction;
  actorPlatformUserId: ObjectId;
  changedFields: EmployeeAuditField[];
  createdAt: Date;
  outcome: "success";
  targetEmployeeId: ObjectId;
};

async function getEmployeeAuditCollection(): Promise<
  Collection<EmployeeAuditDocument>
> {
  const database = await getDatabase();
  return database.collection<EmployeeAuditDocument>("employee_audit");
}

export async function recordEmployeeAudit({
  action,
  actorPlatformUserId,
  changedFields = [],
  session,
  targetEmployeeId,
}: {
  action: EmployeeAuditAction;
  actorPlatformUserId: string;
  changedFields?: readonly EmployeeAuditField[];
  session?: ClientSession;
  targetEmployeeId: string;
}) {
  objectIdStringSchema.parse(actorPlatformUserId);
  objectIdStringSchema.parse(targetEmployeeId);
  await ensureEmployeeDomainIndexes();
  const collection = await getEmployeeAuditCollection();

  await collection.insertOne(
    {
      _id: new ObjectId(),
      action,
      actorPlatformUserId: new ObjectId(actorPlatformUserId),
      changedFields: [...changedFields],
      createdAt: new Date(),
      outcome: "success",
      targetEmployeeId: new ObjectId(targetEmployeeId),
    },
    session ? { session } : undefined,
  );
}
