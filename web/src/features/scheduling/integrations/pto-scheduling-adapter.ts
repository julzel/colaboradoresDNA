import "server-only";
import { calendarHolidayIntegration } from "@/features/calendar/integrations/nager-date-calendar-adapter";

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
      const years = Array.from(
        {
          length:
            Number(input.endDate.slice(0, 4)) - Number(input.startDate.slice(0, 4)) + 1,
        },
        (_, index) => Number(input.startDate.slice(0, 4)) + index,
      );
      const holidays = new Set(
        (
          await Promise.all(
            years.map((year) => calendarHolidayIntegration.listPublicHolidays(year)),
          )
        )
          .flat()
          .map((holiday) => holiday.date),
      );
      const validDays = calculation.dateBreakdown.filter(
        (day) => day.isWorkingDay && !holidays.has(day.date),
      );

      return {
        sourceScheduleIds: [...calculation.sourceScheduleIds],
        totalScheduledMinutes: validDays.reduce(
          (sum, day) => sum + day.scheduledMinutes,
          0,
        ),
        workingDates: validDays.map((day) => day.date),
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
