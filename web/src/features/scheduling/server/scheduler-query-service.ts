import "server-only";

import { scheduleDateSchema } from "@/features/scheduling/domain/schedule";
import { getSchedulerRosterAsAdministrator } from "@/features/scheduling/server/scheduler-service";
import { buildSchedulerDashboardView } from "@/features/scheduling/view-models/scheduler-view";

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
