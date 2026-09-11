import "server-only";

import { getIdentityImageUrls } from "@/features/auth/server/identity-administration";

import { requirePlatformUser } from "@/features/auth/server/require-platform-user";
import { DevelopmentDomainError } from "@/features/development/domain/shared";
import { getDevelopmentSummaryForAdministration } from "@/features/development/server/development-service";
import { parseEmployeeDirectoryQuery } from "@/features/employees/domain/employee-directory-query";
import { listDepartments } from "@/features/employees/server/department-repository";
import { findEmployeeById } from "@/features/employees/server/employee-repository";
import {
  getEmployeeDetailForAdministration,
  listEligibleManagerOptions,
  listEmployeeDirectoryForAdministration,
} from "@/features/employees/server/employee-read-repository";
import { employeeSchedulingIntegration } from "@/features/scheduling/integrations/employee-scheduling-adapter";
import { findPtoBalance } from "@/features/pto/server/pto-repository";

async function requireEmployeeAdministrator() {
  return requirePlatformUser({ roles: ["administrator"] });
}

async function getProfileImageUrl(authUserId: string | null) {
  if (!authUserId) return null;
  return (await getIdentityImageUrls([authUserId])).get(authUserId) ?? null;
}
const getProfileImageUrls = getIdentityImageUrls;

async function getOptionalDevelopmentSummary(employeeId: string) {
  try {
    return await getDevelopmentSummaryForAdministration(employeeId);
  } catch (error) {
    if (error instanceof DevelopmentDomainError && error.code === "forbidden") {
      return null;
    }
    throw error;
  }
}

export async function getEmployeeCreationPageData() {
  await requireEmployeeAdministrator();
  const [departments, managers] = await Promise.all([
    listDepartments(),
    listEligibleManagerOptions(),
  ]);

  return { departments, managers };
}

export async function getEmployeeDirectoryPageData() {
  await requireEmployeeAdministrator();
  const directory = await listEmployeeDirectoryForAdministration(
    parseEmployeeDirectoryQuery({}),
    { paginate: false },
  );
  const imageUrls = await getProfileImageUrls(
    directory.items.flatMap(({ authUserId }) => (authUserId ? [authUserId] : [])),
  );
  const items = directory.items.map(({ authUserId, ...item }) => ({
    ...item,
    profileImageUrl: authUserId ? (imageUrls.get(authUserId) ?? null) : null,
  }));

  return { ...directory, items };
}

export async function getEmployeeDetailPageData(employeeId: string) {
  await requireEmployeeAdministrator();
  const detail = await getEmployeeDetailForAdministration(employeeId);
  if (!detail) return null;

  const [profileImageUrl, development, hasSchedule, ptoBalance] = await Promise.all([
    getProfileImageUrl(detail.access.authUserId),
    getOptionalDevelopmentSummary(employeeId),
    employeeSchedulingIntegration.hasAnySchedule(employeeId),
    findPtoBalance(employeeId),
  ]);

  return {
    detail,
    development,
    hasSchedule,
    profileImageUrl,
    ptoBalanceUnits: ptoBalance?.currentBalanceUnits ?? null,
  };
}

export async function getEmployeeAccessPageData(employeeId: string) {
  await requireEmployeeAdministrator();
  return getEmployeeDetailForAdministration(employeeId);
}

export async function getEmployeeAssignmentPageData(employeeId: string) {
  await requireEmployeeAdministrator();
  const [detail, departments, managers] = await Promise.all([
    getEmployeeDetailForAdministration(employeeId),
    listDepartments(),
    listEligibleManagerOptions(employeeId),
  ]);

  return { departments, detail, managers };
}

export async function getEmployeeSchedulePageData(employeeId: string) {
  await requireEmployeeAdministrator();
  return getEmployeeDetailForAdministration(employeeId);
}

export async function getEmployeePersonalInformationPageData(employeeId: string) {
  await requireEmployeeAdministrator();
  const employee = await findEmployeeById(employeeId);
  if (!employee) return null;

  return {
    birthDay: employee.birthDay,
    birthMonth: employee.birthMonth,
    firstSurname: employee.firstSurname,
    givenNames: employee.givenNames,
    id: employee.id,
    identification: {
      type: employee.identification.type,
      value: employee.identification.value,
    },
    phoneDisplayValue: employee.phoneNumber?.displayValue ?? null,
    secondSurname: employee.secondSurname,
    shareBirthdayOnCalendar: employee.shareBirthdayOnCalendar,
  };
}
