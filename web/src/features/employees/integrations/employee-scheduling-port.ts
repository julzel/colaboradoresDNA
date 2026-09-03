import type { ClientSession } from "mongodb";

/**
 * Employees owns this lifecycle contract. Scheduling provides the adapter so
 * employment changes do not depend on Scheduling repository details.
 */
export interface EmployeeSchedulingIntegration {
  truncateSchedulesForEmploymentEnd(input: {
    actorPlatformUserId: string;
    employeeId: string;
    employmentEndedOn: string;
    session: ClientSession;
  }): Promise<void>;
}
