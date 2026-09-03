import "server-only";

import type { EmployeeSchedulingIntegration } from "@/features/employees/integrations/employee-scheduling-port";
import { closeSchedulesForEmploymentEndInSession } from "@/features/scheduling/server/schedule-repository";

export const employeeSchedulingIntegration: EmployeeSchedulingIntegration = {
  truncateSchedulesForEmploymentEnd: closeSchedulesForEmploymentEndInSession,
};
