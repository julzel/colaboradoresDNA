import "server-only";

import type { EmployeeSchedulingIntegration } from "@/features/employees/integrations/employee-scheduling-port";
import {
  closeSchedulesForEmploymentEndInSession,
  hasAnySchedule,
} from "@/features/scheduling/server/schedule-repository";

export const employeeSchedulingIntegration: EmployeeSchedulingIntegration = {
  hasAnySchedule,
  truncateSchedulesForEmploymentEnd: closeSchedulesForEmploymentEndInSession,
};
