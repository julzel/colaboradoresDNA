import type {
  ProductionAreaDocument,
  ProductionTaskDocument,
  ProductionTaskTemplateDocument,
  ProductionWeekPlanDocument,
} from "@/features/production-tasks/domain/production-task";
import type { ProductionTaskRevisionChange } from "@/features/production-tasks/domain/production-task-revision";
import { getCostaRicaDate } from "@/features/production-tasks/domain/shared";
import type { ProductionTaskEmployee } from "@/features/production-tasks/integrations/production-task-employee-port";
import type {
  ProductionBoardResult,
  ProductionPlanEditorResult,
  ProductionPlanningDashboardResult,
  ProductionTaskAvailabilityWarning,
  ProductionTaskAreaDto,
  ProductionTaskEmployeeDto,
  ProductionTaskTemplateDto,
} from "@/features/production-tasks/application/production-task-contracts";

export function toProductionTaskAreaDto(
  area: ProductionAreaDocument,
): ProductionTaskAreaDto {
  return { id: area._id.toHexString(), name: area.name, sortOrder: area.sortOrder };
}

export function toProductionTaskEmployeeDto(
  employee: ProductionTaskEmployee,
): ProductionTaskEmployeeDto {
  return {
    displayName: employee.displayName,
    email: employee.email,
    employeeCode: employee.employeeCode,
    id: employee.employeeId,
  };
}

export function toProductionTaskTemplateDto(
  template: ProductionTaskTemplateDocument,
): ProductionTaskTemplateDto {
  return {
    areaId: template.areaId.toHexString(),
    areaName: template.areaLabelSnapshot,
    description: template.description,
    id: template._id.toHexString(),
    subject: template.subject ?? "",
  };
}

export function createProductionPlanningDashboardResult({
  areas,
  plans,
  templates = [],
}: {
  areas: ProductionAreaDocument[];
  plans: ProductionWeekPlanDocument[];
  templates?: ProductionTaskTemplateDocument[];
}): ProductionPlanningDashboardResult {
  const activeAreaIds = new Set(areas.map((area) => area._id.toHexString()));
  return {
    areas: areas.map(toProductionTaskAreaDto),
    plans: plans.map((plan) => ({
      assigneeCount: new Set(
        plan.tasks.flatMap((task) => task.assigneeEmployeeIds.map(String)),
      ).size,
      blockingErrorCount: 0,
      completedTaskCount: plan.tasks.filter((task) => task.status === "completed")
        .length,
      id: plan._id.toHexString(),
      revision: plan.revision,
      status: plan.status,
      taskCount: plan.tasks.length,
      updatedAt: plan.updatedAt.toISOString(),
      version: plan.version,
      weekEnd: plan.weekEnd,
      weekStart: plan.weekStart,
    })),
    templates: templates
      .map(toProductionTaskTemplateDto)
      .filter((template) => activeAreaIds.has(template.areaId)),
  };
}

export function createProductionPlanEditorResult({
  areas,
  employees,
  plan,
  revisionChanges = [],
  templates = [],
  warnings = new Map(),
}: {
  areas: ProductionAreaDocument[];
  employees: ProductionTaskEmployee[];
  plan: ProductionWeekPlanDocument;
  revisionChanges?: ProductionTaskRevisionChange[];
  templates?: ProductionTaskTemplateDocument[];
  warnings?: Map<string, ProductionTaskAvailabilityWarning[]>;
}): ProductionPlanEditorResult {
  const activeAreaIds = new Set(areas.map((area) => area._id.toHexString()));
  return {
    areas: areas.map(toProductionTaskAreaDto),
    employees: employees.map(toProductionTaskEmployeeDto),
    revisionChanges,
    templates: templates
      .map(toProductionTaskTemplateDto)
      .filter((template) => activeAreaIds.has(template.areaId)),
    plan: {
      id: plan._id.toHexString(),
      revision: plan.revision,
      status: plan.status,
      tasks: plan.tasks.map((task) => ({
        areaId: task.areaId.toHexString(),
        assigneeEmployeeIds: task.assigneeEmployeeIds.map(String),
        description: task.description,
        id: task.id.toHexString(),
        sortOrder: task.sortOrder,
        status: task.status,
        subject: task.subject ?? "",
        warnings: warnings.get(task.id.toHexString()) ?? [],
        workDate: task.workDate,
      })),
      version: plan.version,
      weekEnd: plan.weekEnd,
      weekStart: plan.weekStart,
    },
  };
}

function taskResult({
  canManage,
  currentEmployeeId,
  planId,
  task,
  today,
}: {
  canManage: boolean;
  currentEmployeeId: string | null;
  planId: string;
  task: ProductionTaskDocument;
  today: string;
}): ProductionBoardResult["tasks"][number] {
  const assigneeEmployeeIds = task.assigneeEmployeeIds.map(String);
  const isAssigned = currentEmployeeId
    ? assigneeEmployeeIds.includes(currentEmployeeId)
    : false;
  const completedBusinessDate = task.completedAt
    ? getCostaRicaDate(task.completedAt)
    : null;

  return {
    areaId: task.areaId.toHexString(),
    areaName: task.areaLabelSnapshot,
    assigneeEmployeeIds,
    completedAt: task.completedAt?.toISOString() ?? null,
    completedByEmployeeId: task.completedByEmployeeId?.toHexString() ?? null,
    description: task.description,
    id: task.id.toHexString(),
    permissions: {
      complete: task.status === "pending" && (isAssigned || canManage),
      reopen: task.status === "completed" && canManage,
      undoCompletion:
        task.status === "completed" &&
        !!currentEmployeeId &&
        task.completedByEmployeeId?.toHexString() === currentEmployeeId &&
        completedBusinessDate === today,
    },
    planId,
    sortOrder: task.sortOrder,
    status: task.status,
    subject: task.subject,
    version: task.version,
    workDate: task.workDate,
  };
}

export function createProductionBoardResult({
  areas,
  canManage,
  currentEmployeeId,
  employees,
  plan,
  selectedFilters,
  selectedDate,
  today = getCostaRicaDate(),
  view,
  weekEnd,
  weekStart,
}: {
  areas: ProductionAreaDocument[];
  canManage: boolean;
  currentEmployeeId: string | null;
  employees: ProductionTaskEmployee[];
  plan: ProductionWeekPlanDocument | null;
  selectedFilters: {
    areaId: string | null;
    assigneeId: string | null;
    status: "completed" | "pending" | null;
  };
  selectedDate: string;
  today?: string;
  view: "day" | "week";
  weekEnd: string;
  weekStart: string;
}): ProductionBoardResult {
  const areaOrder = new Map(
    areas.map((area) => [area._id.toHexString(), area.sortOrder]),
  );
  const planId = plan?._id.toHexString() ?? null;
  const tasks = (plan?.tasks ?? [])
    .filter(
      (task) =>
        (view === "week" || task.workDate === selectedDate) &&
        (!selectedFilters.areaId ||
          task.areaId.toHexString() === selectedFilters.areaId) &&
        (!selectedFilters.assigneeId ||
          task.assigneeEmployeeIds.some(
            (employeeId) => employeeId.toHexString() === selectedFilters.assigneeId,
          )) &&
        (!selectedFilters.status || task.status === selectedFilters.status),
    )
    .sort(
      (first, second) =>
        first.workDate.localeCompare(second.workDate) ||
        (areaOrder.get(first.areaId.toHexString()) ?? Number.MAX_SAFE_INTEGER) -
          (areaOrder.get(second.areaId.toHexString()) ?? Number.MAX_SAFE_INTEGER) ||
        first.sortOrder - second.sortOrder,
    )
    .map((task) =>
      taskResult({ canManage, currentEmployeeId, planId: planId!, task, today }),
    );

  return {
    areas: areas.map(toProductionTaskAreaDto),
    canManage,
    currentEmployeeId,
    employees: employees.map(toProductionTaskEmployeeDto),
    plan: plan ? { id: planId!, revision: plan.revision } : null,
    query: { ...selectedFilters, selectedDate, view, weekEnd, weekStart },
    tasks,
    today,
  };
}
