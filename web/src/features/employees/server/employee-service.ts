import "server-only";

import { ObjectId, type ClientSession } from "mongodb";

import {
  createInvitedPlatformUser,
  ensureAuthIndexes,
} from "@/features/auth/server/platform-user-repository";
import type { PlatformRole } from "@/features/auth/domain/platform-user";
import type { EmployeeAssignmentInput } from "@/features/employees/domain/assignment";
import {
  formatEmployeeDisplayName,
  type EmployeeInput,
} from "@/features/employees/domain/employee";
import type { EmployeeScheduleInput } from "@/features/employees/domain/schedule";
import {
  createEmployeeAssignmentInSession,
  replaceEmployeeAssignment,
} from "@/features/employees/server/assignment-repository";
import {
  createDepartment,
  listDepartments,
  setDepartmentStatus,
  updateDepartment,
} from "@/features/employees/server/department-repository";
import type { DepartmentInput } from "@/features/employees/domain/department";
import { recordEmployeeAudit } from "@/features/employees/server/employee-audit-repository";
import { ensureEmployeeDomainIndexes } from "@/features/employees/server/employee-indexes";
import {
  createEmployee,
  findEmployeeById,
  listBirthdayCalendarEntries,
  listEmployeeDirectory,
  updateEmployeeSelfServiceProfile,
  updateEmployeePersonalInformation,
} from "@/features/employees/server/employee-repository";
import { getEmployeeSelfServiceProfileDetail } from "@/features/employees/server/employee-read-repository";
import { replaceEmployeeSchedule } from "@/features/employees/server/schedule-repository";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";
import { createOpeningPtoBalanceInSession } from "@/features/pto/server/pto-repository";
import { ensurePtoIndexes } from "@/features/pto/server/pto-indexes";
import { getDatabase, getMongoClient } from "@/lib/server/mongodb";

export type CreateEmployeeModelInput = {
  assignment: Omit<EmployeeAssignmentInput, "createdByPlatformUserId" | "employeeId">;
  employee: EmployeeInput;
};

export type CreateEmployeeWithAccessInput = Omit<
  CreateEmployeeModelInput,
  "employee"
> & {
  access: { email: string; role: PlatformRole };
  employee: Omit<EmployeeInput, "platformUserId">;
  openingPtoBalanceUnits: number;
};

async function synchronizePlatformDisplayName({
  displayName,
  platformUserId,
  session,
}: {
  displayName: string;
  platformUserId: string;
  session: ClientSession;
}) {
  const database = await getDatabase();
  await database
    .collection("platform_users")
    .updateOne(
      { _id: new ObjectId(platformUserId) },
      { $set: { displayName, updatedAt: new Date() } },
      { session },
    );
}

export async function createEmployeeModel(input: CreateEmployeeModelInput) {
  const { platformUser: actor } = await requirePlatformUser({
    roles: ["administrator"],
  });
  await ensureEmployeeDomainIndexes();
  const client = await getMongoClient();

  return client.withSession(async (session) => {
    let result:
      | {
          assignment: Awaited<ReturnType<typeof createEmployeeAssignmentInSession>>;
          employee: Awaited<ReturnType<typeof createEmployee>>;
        }
      | undefined;

    await session.withTransaction(async () => {
      const employee = await createEmployee(input.employee, { session });
      const assignment = await createEmployeeAssignmentInSession(
        {
          ...input.assignment,
          createdByPlatformUserId: actor.id,
          employeeId: employee.id,
        },
        session,
      );
      await synchronizePlatformDisplayName({
        displayName: formatEmployeeDisplayName(employee),
        platformUserId: employee.platformUserId,
        session,
      });
      await recordEmployeeAudit({
        action: "employee_created",
        actorPlatformUserId: actor.id,
        changedFields: [
          "birthDay",
          "birthMonth",
          "employmentStartedOn",
          "employmentStatus",
          "firstSurname",
          "givenNames",
          "identification",
          "phoneNumber",
          "secondSurname",
          "shareBirthdayOnCalendar",
        ],
        session,
        targetEmployeeId: employee.id,
      });

      result = { assignment, employee };
    });

    if (!result) {
      throw new Error("Employee creation transaction did not return a result.");
    }

    return result;
  });
}

export async function createEmployeeWithAccess(input: CreateEmployeeWithAccessInput) {
  const { platformUser: actor } = await requirePlatformUser({
    roles: ["administrator"],
  });
  await Promise.all([
    ensureAuthIndexes(),
    ensureEmployeeDomainIndexes(),
    ensurePtoIndexes(),
  ]);
  const client = await getMongoClient();

  return client.withSession(async (session) => {
    let result:
      | {
          employee: Awaited<ReturnType<typeof createEmployee>>;
          platformUser: Awaited<ReturnType<typeof createInvitedPlatformUser>>;
        }
      | undefined;

    await session.withTransaction(async () => {
      const displayName = formatEmployeeDisplayName(input.employee as never);
      const platformUser = await createInvitedPlatformUser(
        {
          displayName,
          email: input.access.email,
          role: input.access.role,
        },
        { session },
      );
      const employee = await createEmployee(
        { ...input.employee, platformUserId: platformUser.id },
        { session },
      );
      await createEmployeeAssignmentInSession(
        {
          ...input.assignment,
          createdByPlatformUserId: actor.id,
          employeeId: employee.id,
        },
        session,
      );
      await createOpeningPtoBalanceInSession({
        actorPlatformUserId: actor.id,
        employeeId: employee.id,
        openingBalanceUnits: input.openingPtoBalanceUnits,
        session,
      });
      await recordEmployeeAudit({
        action: "employee_created",
        actorPlatformUserId: actor.id,
        changedFields: [
          "birthDay",
          "birthMonth",
          "employmentStartedOn",
          "employmentStatus",
          "firstSurname",
          "givenNames",
          "identification",
          "phoneNumber",
          "secondSurname",
          "shareBirthdayOnCalendar",
        ],
        session,
        targetEmployeeId: employee.id,
      });
      result = { employee, platformUser };
    });

    if (!result) throw new Error("Employee creation did not return a result.");
    return { ...result, actor };
  });
}

export async function createDepartmentAsAdministrator(input: DepartmentInput) {
  await requirePlatformUser({ roles: ["administrator"] });
  return createDepartment(input);
}

export async function setDepartmentStatusAsAdministrator(
  input: Parameters<typeof setDepartmentStatus>[0],
) {
  await requirePlatformUser({ roles: ["administrator"] });
  return setDepartmentStatus(input);
}

export async function updateDepartmentAsAdministrator(
  input: Parameters<typeof updateDepartment>[0],
) {
  await requirePlatformUser({ roles: ["administrator"] });
  return updateDepartment(input);
}

export async function listDepartmentOptions() {
  await requirePlatformUser();
  return listDepartments();
}

export async function getEmployeeDirectory() {
  await requirePlatformUser();
  return listEmployeeDirectory();
}

export async function getBirthdayCalendarEntries() {
  const { platformUser } = await requirePlatformUser();
  return listBirthdayCalendarEntries({ viewerRole: platformUser.role });
}

export async function getOwnEmployeeProfile() {
  const { clerkHasImage, clerkImageUrl, platformUser } = await requirePlatformUser();
  const profile = await getEmployeeSelfServiceProfileDetail(platformUser.id);

  return profile
    ? {
        ...profile,
        image: {
          hasImage: clerkHasImage,
          url: clerkImageUrl,
        },
      }
    : null;
}

export async function getEmployeeProfileAsAdministrator(employeeId: string) {
  await requirePlatformUser({ roles: ["administrator"] });
  return findEmployeeById(employeeId);
}

export async function updateEmployeePersonalInformationAsAdministrator(
  employeeId: string,
  input: EmployeeInput,
) {
  const { platformUser } = await requirePlatformUser({
    roles: ["administrator"],
  });

  return updateEmployeePersonalInformation({
    actorPlatformUserId: platformUser.id,
    employeeId,
    input,
  });
}

export async function updateOwnEmployeeProfile(
  input: Parameters<typeof updateEmployeeSelfServiceProfile>[0]["input"],
) {
  const { platformUser } = await requirePlatformUser();

  return updateEmployeeSelfServiceProfile({
    actorPlatformUserId: platformUser.id,
    input,
  });
}

export async function replaceEmployeeAssignmentAsAdministrator(
  input: Omit<EmployeeAssignmentInput, "createdByPlatformUserId" | "effectiveTo">,
) {
  const { platformUser } = await requirePlatformUser({
    roles: ["administrator"],
  });

  return replaceEmployeeAssignment({
    ...input,
    createdByPlatformUserId: platformUser.id,
  });
}

export async function replaceEmployeeScheduleAsAdministrator(
  input: Omit<EmployeeScheduleInput, "createdByPlatformUserId" | "effectiveTo">,
) {
  const { platformUser } = await requirePlatformUser({
    roles: ["administrator"],
  });

  return replaceEmployeeSchedule({
    ...input,
    createdByPlatformUserId: platformUser.id,
  });
}
