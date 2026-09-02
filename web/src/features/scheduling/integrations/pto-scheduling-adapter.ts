import "server-only";

import {
  PtoScheduleCalculationError,
  type PtoSchedulingIntegration,
} from "@/features/pto/integrations/pto-scheduling-port";
import { SchedulingDomainError } from "@/features/scheduling/domain/schedule";
import { resolveEmployeeWorkRange } from "@/features/scheduling/server/scheduler-service";

export const ptoSchedulingIntegration: PtoSchedulingIntegration = {
  async calculateFullDayLeave(input) {
    try {
      const calculation = await resolveEmployeeWorkRange(input);

      return {
        sourceScheduleIds: [...calculation.sourceScheduleIds],
        totalScheduledMinutes: calculation.totalScheduledMinutes,
        workingDates: [...calculation.workingDates],
      };
    } catch (error) {
      if (
        error instanceof SchedulingDomainError &&
        ["coverage_gap", "overlapping_schedule_coverage"].includes(error.code)
      ) {
        throw new PtoScheduleCalculationError("schedule_incomplete");
      }

      throw error;
    }
  },
};
