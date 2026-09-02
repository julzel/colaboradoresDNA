import "server-only";

import { scheduleDateSchema } from "@/features/scheduling/domain/schedule";
import {
  getEmployeeScheduleHistoryAsAdministrator,
  getOwnEmployeeSchedule,
  getSchedulerRosterAsAdministrator,
} from "@/features/scheduling/server/scheduler-service";
import {
  buildOwnScheduleView,
  buildSchedulerDashboardView,
  buildSchedulerDetailView,
} from "@/features/scheduling/view-models/scheduler-view";

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

export async function getSchedulerDashboardPageData(requestedDate?: string) {
  const parsedDate = scheduleDateSchema.safeParse(requestedDate);
  const selectedDate = parsedDate.success ? parsedDate.data : todayInCostaRica();
  const roster = await getSchedulerRosterAsAdministrator(selectedDate);

  return buildSchedulerDashboardView(roster, selectedDate);
}

export async function getOwnSchedulePageData(requestedDate?: string) {
  const parsedDate = scheduleDateSchema.safeParse(requestedDate);
  const selectedDate = parsedDate.success ? parsedDate.data : todayInCostaRica();
  const schedule = await getOwnEmployeeSchedule(selectedDate);

  return buildOwnScheduleView(schedule, selectedDate);
}

export async function getSchedulerDetailPageData(
  employeeId: string,
  requestedDate?: string,
) {
  const parsedDate = scheduleDateSchema.safeParse(requestedDate);
  const selectedDate = parsedDate.success ? parsedDate.data : todayInCostaRica();
  const roster = await getSchedulerRosterAsAdministrator(selectedDate);
  const employee = roster.find((item) => item.id === employeeId);
  if (!employee) return null;
  const history = await getEmployeeScheduleHistoryAsAdministrator(employeeId);

  return buildSchedulerDetailView({
    currentSchedule: employee.schedule,
    displayName: employee.displayName,
    employeeId,
    history,
    selectedDate,
  });
}
