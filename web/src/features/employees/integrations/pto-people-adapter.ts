import "server-only";

import { listPlatformUserDisplayNamesByIds } from "@/features/auth/server/platform-user-repository";
import { listEmployeeDisplayNamesByIds } from "@/features/employees/server/employee-repository";
import type { PtoPeopleIntegration } from "@/features/pto/integrations/pto-people-port";

export const ptoPeopleIntegration: PtoPeopleIntegration = {
  async getDisplayNames({ employeeIds, platformUserIds }) {
    const [employees, platformUsers] = await Promise.all([
      listEmployeeDisplayNamesByIds(employeeIds),
      listPlatformUserDisplayNamesByIds(platformUserIds),
    ]);
    return { employees, platformUsers };
  },
};
