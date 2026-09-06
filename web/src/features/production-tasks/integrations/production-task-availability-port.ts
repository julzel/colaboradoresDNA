export type ProductionTaskAvailability = {
  hasApprovedLeave: boolean;
  scheduleStatus: "scheduled" | "not_scheduled" | "unknown";
};

export interface ProductionTaskAvailabilityPort {
  check(input: {
    employeeId: string;
    workDate: string;
  }): Promise<ProductionTaskAvailability>;
}
