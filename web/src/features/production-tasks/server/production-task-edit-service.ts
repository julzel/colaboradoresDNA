import "server-only";
import { productionTaskEmployeeAdapter } from "@/features/employees/integrations/production-task-employee-adapter";
import { productionTaskAvailabilityAdapter } from "../integrations/production-task-availability-adapter";
import {
  taskEditCommandSchema,
  requireEditableTaskDate,
  TaskAvailabilityError,
} from "../domain/production-task-edit";
import {
  getCostaRicaDate,
  getMondayForDate,
  productionDateSchema,
  ProductionTaskDomainError,
} from "../domain/shared";
import { requireProductionTaskManager } from "./production-task-authorization";
import {
  findCurrentPublishedPlan,
  findProductionPlanById,
  listProductionAreas,
} from "./production-task-repository";
import { commitTaskEdit } from "./production-task-edit-repository";
import { observeProductionOperation } from "./production-task-observability";
import type { ProductionTaskEditOptions } from "../application/production-task-contracts";

export async function getProductionTaskEditOptions(
  date: string,
): Promise<ProductionTaskEditOptions> {
  await requireProductionTaskManager();
  const parsedDate = productionDateSchema.parse(date);
  const [areas, employees, plan] = await Promise.all([
    listProductionAreas(),
    productionTaskEmployeeAdapter.listActiveEmployees(),
    findCurrentPublishedPlan(getMondayForDate(parsedDate)),
  ]);
  return {
    today: getCostaRicaDate(),
    targetPlanId: plan?._id.toHexString() ?? null,
    areas: areas.map((area) => ({
      id: area._id.toHexString(),
      name: area.name,
      sortOrder: area.sortOrder,
    })),
    employees: employees.map((person) => ({
      id: person.employeeId,
      displayName: person.displayName,
      employeeCode: person.employeeCode,
    })),
  };
}

export async function editProductionTask(input: unknown) {
  return observeProductionOperation("task_edit", () => applyProductionTaskEdit(input));
}

async function applyProductionTaskEdit(input: unknown) {
  const auth = await requireProductionTaskManager();
  const command = taskEditCommandSchema.parse(input);
  const today = getCostaRicaDate();
  if (command.action !== "create") {
    const plan = await findProductionPlanById(command.source.planId);
    const task = plan?.tasks.find(
      (item) => item.id.toHexString() === command.source.taskId,
    );
    if (
      !task ||
      plan?.currentSlot !== "published" ||
      task.version !== command.source.expectedTaskVersion
    )
      throw new ProductionTaskDomainError("stale_version");
    requireEditableTaskDate(task.workDate, today);
  }
  if (command.action === "remove") return commitTaskEdit(command, auth.platformUser.id);
  requireEditableTaskDate(command.task.workDate, today);
  const [areas, employees] = await Promise.all([
    listProductionAreas(),
    productionTaskEmployeeAdapter.listActiveEmployees(),
  ]);
  const area = areas.find((item) => item._id.toHexString() === command.task.areaId);
  if (!area) throw new ProductionTaskDomainError("area_not_found");
  const employeeIds = new Set(employees.map((employee) => employee.employeeId));
  if (command.task.assigneeEmployeeIds.some((id) => !employeeIds.has(id)))
    throw new ProductionTaskDomainError("active_employee_required");
  const availability = await Promise.all(
    command.task.assigneeEmployeeIds.map((employeeId) =>
      productionTaskAvailabilityAdapter
        .check({ employeeId, workDate: command.task.workDate })
        .catch(() => ({ hasApprovedLeave: false, scheduleStatus: "unknown" as const })),
    ),
  );
  const warnings = [
    ...new Set(
      availability.flatMap((item) => [
        ...(item.hasApprovedLeave ? ["approved_leave"] : []),
        ...(item.scheduleStatus === "not_scheduled" ? ["not_scheduled"] : []),
        ...(item.scheduleStatus === "unknown" ? ["availability_unknown"] : []),
      ]),
    ),
  ];
  if (!command.acknowledgeWarnings && warnings.length)
    throw new TaskAvailabilityError(warnings);
  return commitTaskEdit(command, auth.platformUser.id, {
    ...command.task,
    areaLabelSnapshot: area.name,
  });
}
