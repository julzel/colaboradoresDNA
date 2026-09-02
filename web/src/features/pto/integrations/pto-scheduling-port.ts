export type PtoScheduleDuration = {
  sourceScheduleIds: string[];
  totalScheduledMinutes: number;
  workingDates: string[];
};

export class PtoScheduleCalculationError extends Error {
  constructor(public readonly code: "schedule_incomplete") {
    super(code);
    this.name = "PtoScheduleCalculationError";
  }
}

/**
 * PTO owns this narrow contract. Scheduling supplies neutral work occurrences;
 * PTO decides how those occurrences translate into leave balance units.
 */
export interface PtoSchedulingIntegration {
  calculateFullDayLeave(input: {
    employeeId: string;
    endDate: string;
    startDate: string;
  }): Promise<PtoScheduleDuration>;
}
