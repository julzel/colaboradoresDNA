import "server-only";

import { requirePlatformUser } from "@/features/auth/server/require-platform-user";
import { schedulingEmployeeIntegration } from "@/features/employees/integrations/scheduling-employee-adapter";
import {
  calculateScheduleRange,
  scheduleV2InputSchema,
  SchedulingDomainError,
  type ScheduleV2Input,
} from "@/features/scheduling/domain/schedule";
import {
  createSchedule,
  findEffectiveSchedule,
  listScheduleHistory,
  listSchedulesEffectiveOn,
  listSchedulesOverlappingRange,
  replaceSchedule,
} from "@/features/scheduling/server/schedule-repository";

function todayInCostaRica(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Costa_Rica",
    year: "numeric",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

export type EmployeeScheduleCommand = ScheduleV2Input & {
  employeeId: string;
};

function parseCommand(command: EmployeeScheduleCommand) {
  const schedule = scheduleV2InputSchema.parse(command);
  return { employeeId: command.employeeId, schedule };
}

export async function createEmployeeScheduleAsAdministrator(
  command: EmployeeScheduleCommand,
) {
  const { platformUser } = await requirePlatformUser({
    roles: ["administrator"],
  });
  const { employeeId, schedule } = parseCommand(command);

  return createSchedule({
    ...schedule,
    createdByPlatformUserId: platformUser.id,
    employeeId,
  });
}

export async function replaceEmployeeScheduleAsAdministrator(
  command: Omit<EmployeeScheduleCommand, "effectiveTo">,
) {
  const { platformUser } = await requirePlatformUser({
    roles: ["administrator"],
  });
  const { employeeId, schedule } = parseCommand({
    ...command,
    effectiveTo: null,
  });

  return replaceSchedule({
    ...schedule,
    createdByPlatformUserId: platformUser.id,
    employeeId,
  });
}

export async function getEmployeeScheduleAsAdministrator({
  employeeId,
  onDate = todayInCostaRica(),
}: {
  employeeId: string;
  onDate?: string;
}) {
  await requirePlatformUser({ roles: ["administrator"] });
  return findEffectiveSchedule({ employeeId, onDate });
}

export async function getEmployeeScheduleHistoryAsAdministrator(employeeId: string) {
  await requirePlatformUser({ roles: ["administrator"] });
  return listScheduleHistory(employeeId);
}

export async function listEmployeeSchedulesAsAdministrator(
  onDate = todayInCostaRica(),
) {
  await requirePlatformUser({ roles: ["administrator"] });
  return listSchedulesEffectiveOn(onDate);
}

/** Roster contract for a future scheduler UI, including missing schedules. */
export async function getSchedulerRosterAsAdministrator(onDate = todayInCostaRica()) {
  await requirePlatformUser({ roles: ["administrator"] });
  const [employees, schedules] = await Promise.all([
    schedulingEmployeeIntegration.listActiveEmployees(),
    listSchedulesEffectiveOn(onDate),
  ]);
  const scheduleByEmployee = new Map(
    schedules.map((schedule) => [schedule.employeeId, schedule]),
  );

  return employees.map((employee) => ({
    ...employee,
    schedule: scheduleByEmployee.get(employee.id) ?? null,
  }));
}

/**
 * Self-service reads derive the employee from the authenticated account. There
 * is intentionally no collaborator-facing mutation or arbitrary employee ID.
 */
export async function getOwnEmployeeSchedule(onDate = todayInCostaRica()) {
  const { platformUser } = await requirePlatformUser();
  const employeeId =
    await schedulingEmployeeIntegration.findActiveEmployeeIdByPlatformUserId(
      platformUser.id,
    );

  if (!employeeId) return null;
  return findEffectiveSchedule({ employeeId, onDate });
}

export async function resolveEmployeeWorkRangeAsAdministrator(input: {
  employeeId: string;
  endDate: string;
  startDate: string;
}) {
  await requirePlatformUser({ roles: ["administrator"] });
  return resolveEmployeeWorkRange(input);
}

/**
 * Internal application API used by provider adapters. It returns scheduling
 * facts only; leave, payroll, and holiday policies belong to their consumers.
 */
export async function resolveEmployeeWorkRange({
  employeeId,
  endDate,
  startDate,
}: {
  employeeId: string;
  endDate: string;
  startDate: string;
}) {
  const schedules = await listSchedulesOverlappingRange({
    employeeId,
    endDate,
    startDate,
  });

  if (schedules.length === 0) {
    throw new SchedulingDomainError("coverage_gap", {
      date: startDate,
      endDate,
      sourceScheduleIds: [],
      startDate,
    });
  }

  return calculateScheduleRange(schedules, startDate, endDate);
}
