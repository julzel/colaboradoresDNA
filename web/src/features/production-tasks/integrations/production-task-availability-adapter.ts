import "server-only";

import { productionTaskPtoAdapter } from "@/features/pto/integrations/production-task-pto-adapter";
import { productionTaskSchedulingAdapter } from "@/features/scheduling/integrations/production-task-scheduling-adapter";
import type { ProductionTaskAvailabilityPort } from "@/features/production-tasks/integrations/production-task-availability-port";

export const productionTaskAvailabilityAdapter: ProductionTaskAvailabilityPort = {
  async check(input) {
    const [schedule, leave] = await Promise.all([
      productionTaskSchedulingAdapter.check(input),
      productionTaskPtoAdapter.check(input),
    ]);
    return {
      hasApprovedLeave: leave.hasApprovedLeave,
      scheduleStatus: schedule.scheduleStatus,
    };
  },
};
