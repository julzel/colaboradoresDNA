import "server-only";

import type { ProductionTaskAvailabilityPort } from "@/features/production-tasks/integrations/production-task-availability-port";
import { SchedulingDomainError } from "@/features/scheduling/domain/schedule";
import { resolveEmployeeWorkRange } from "@/features/scheduling/server/scheduler-service";

export const productionTaskSchedulingAdapter: Pick<
  ProductionTaskAvailabilityPort,
  "check"
> = {
  async check({ employeeId, workDate }) {
    try {
      const result = await resolveEmployeeWorkRange({
        employeeId,
        endDate: workDate,
        startDate: workDate,
      });
      return {
        hasApprovedLeave: false,
        scheduleStatus: result.workingDates.includes(workDate)
          ? "scheduled"
          : "not_scheduled",
      };
    } catch (error) {
      if (error instanceof SchedulingDomainError)
        return { hasApprovedLeave: false, scheduleStatus: "unknown" };
      throw error;
    }
  },
};
