import type { ClientSession } from "mongodb";

export type SchedulingEmployeeSummary = Readonly<{
  displayName: string;
  id: string;
}>;

export interface SchedulingEmployeeIntegration {
  employeeIsActive(employeeId: string, session?: ClientSession): Promise<boolean>;
  findActiveEmployeeIdByPlatformUserId(platformUserId: string): Promise<string | null>;
  listActiveEmployees(): Promise<readonly SchedulingEmployeeSummary[]>;
  recordScheduleAudit(input: {
    action: "schedule_closed" | "schedule_created";
    actorPlatformUserId: string;
    session: ClientSession;
    targetEmployeeId: string;
  }): Promise<void>;
}
