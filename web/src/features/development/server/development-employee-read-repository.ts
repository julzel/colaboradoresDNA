import "server-only";

import { ObjectId } from "mongodb";

import { developmentObjectIdSchema } from "@/features/development/domain/shared";
import type { EmployeeDocument } from "@/features/employees/domain/employee";
import {
  formatEmployeePreferredDisplayName,
  getDisplayNameInitials,
} from "@/features/employees/domain/employee";
import type { EmployeeAssignmentDocument } from "@/features/employees/domain/assignment";
import type { DepartmentDocument } from "@/features/employees/domain/department";
import type {
  DevelopmentEmployeeIdentity,
  DevelopmentEmployeeReference,
} from "@/features/development/view-models/development-view";
import { getDatabase } from "@/lib/server/mongodb";

export const developmentEmployeeReferenceProjection = {
  _id: 1,
  employmentStatus: 1,
} as const;

function toDevelopmentEmployeeReference(
  employee: Pick<EmployeeDocument, "_id" | "employmentStatus">,
): DevelopmentEmployeeReference {
  return {
    employmentStatus: employee.employmentStatus,
    id: employee._id.toHexString(),
  };
}

function todayInCostaRica() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Costa_Rica",
    year: "numeric",
  }).format(new Date());
}

export async function findDevelopmentEmployeeIdentityById(
  employeeId: string,
): Promise<DevelopmentEmployeeIdentity | null> {
  const parsedEmployeeId = new ObjectId(developmentObjectIdSchema.parse(employeeId));
  const database = await getDatabase();
  const employee = await database.collection<EmployeeDocument>("employees").findOne(
    { _id: parsedEmployeeId },
    {
      projection: {
        _id: 1,
        employmentStatus: 1,
        firstSurname: 1,
        givenNames: 1,
        platformUserId: 1,
        preferredName: 1,
        secondSurname: 1,
      },
    },
  );
  if (!employee) return null;

  const assignment = await database
    .collection<EmployeeAssignmentDocument>("employee_assignments")
    .findOne(
      {
        effectiveFrom: { $lte: todayInCostaRica() },
        employeeId: parsedEmployeeId,
        $or: [{ effectiveTo: null }, { effectiveTo: { $gte: todayInCostaRica() } }],
      },
      {
        projection: { departmentId: 1, positionTitle: 1 },
        sort: { effectiveFrom: -1 },
      },
    );
  const department = assignment
    ? await database
        .collection<DepartmentDocument>("departments")
        .findOne({ _id: assignment.departmentId }, { projection: { name: 1 } })
    : null;
  const displayName = formatEmployeePreferredDisplayName(employee);

  return {
    departmentName: department?.name ?? null,
    displayName,
    employmentStatus: employee.employmentStatus,
    id: employee._id.toHexString(),
    initials: getDisplayNameInitials(displayName),
    platformUserId: employee.platformUserId.toHexString(),
    positionTitle: assignment?.positionTitle ?? null,
  };
}

export async function findDevelopmentEmployeeById(
  employeeId: string,
): Promise<DevelopmentEmployeeReference | null> {
  const database = await getDatabase();
  const employee = await database
    .collection<EmployeeDocument>("employees")
    .findOne(
      { _id: new ObjectId(developmentObjectIdSchema.parse(employeeId)) },
      { projection: developmentEmployeeReferenceProjection },
    );

  return employee ? toDevelopmentEmployeeReference(employee) : null;
}

export async function findDevelopmentEmployeeByPlatformUserId(
  platformUserId: string,
): Promise<DevelopmentEmployeeReference | null> {
  const database = await getDatabase();
  const employee = await database.collection<EmployeeDocument>("employees").findOne(
    {
      platformUserId: new ObjectId(developmentObjectIdSchema.parse(platformUserId)),
    },
    { projection: developmentEmployeeReferenceProjection },
  );

  return employee ? toDevelopmentEmployeeReference(employee) : null;
}
