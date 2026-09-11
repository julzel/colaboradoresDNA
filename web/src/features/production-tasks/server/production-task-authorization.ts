import "server-only";

import { requirePlatformUser } from "@/features/auth/server/require-platform-user";
import { productionTaskEmployeeAdapter } from "@/features/employees/integrations/production-task-employee-adapter";
import { getCostaRicaDate, ProductionTaskDomainError } from "../domain/shared";

export async function canManageProductionTasks(user: { id: string; role: string }) {
  if (user.role === "administrator") return true;
  if (user.role !== "supervisor") return false;
  return productionTaskEmployeeAdapter.isProductionEmployee(
    user.id,
    getCostaRicaDate(),
  );
}

export async function requireProductionTaskManager() {
  const auth = await requirePlatformUser();
  if (!(await canManageProductionTasks(auth.platformUser))) {
    throw new ProductionTaskDomainError("forbidden");
  }
  return auth;
}
