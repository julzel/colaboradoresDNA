import "server-only";

import { ObjectId } from "mongodb";

import { requirePlatformUser } from "@/features/auth/server/require-platform-user";
import { productionTaskEmployeeAdapter } from "@/features/employees/integrations/production-task-employee-adapter";
import type {
  ProductionBoardQuery,
  ProductionTaskAvailabilityWarning,
  TodayProductionTaskSummaryResult,
} from "@/features/production-tasks/application/production-task-contracts";
import {
  createProductionBoardResult,
  createProductionPlanEditorResult,
  createProductionPlanningDashboardResult,
} from "@/features/production-tasks/application/production-task-queries";
import { productionTaskAvailabilityAdapter } from "@/features/production-tasks/integrations/production-task-availability-adapter";
import {
  productionTaskDraftInputSchema,
  productionAreaInputSchema,
  productionTaskTemplateInputSchema,
  productionWeekDraftInputSchema,
  type ProductionTaskDraftInput,
} from "@/features/production-tasks/domain/production-task";
import { compareProductionPlanRevisions } from "@/features/production-tasks/domain/production-task-revision";
import {
  ProductionTaskDomainError,
  addCalendarDays,
  getCostaRicaDate,
  getMondayForDate,
  productionDateSchema,
  productionObjectIdSchema,
} from "@/features/production-tasks/domain/shared";
import {
  createOrGetProductionWeekDraft,
  archiveProductionTaskTemplate,
  archiveProductionArea,
  createProductionArea,
  createProductionTaskTemplate,
  findCurrentPublishedPlan,
  findProductionPlanById,
  findTaskInPublishedPlan,
  listProductionAreas,
  listUnreadProductionAssignmentChanges,
  listProductionPlans,
  listProductionPlanRevisions,
  listProductionTaskTemplates,
  markProductionAssignmentChangesRead,
  publishProductionWeekDraft,
  saveProductionWeekDraft,
  transitionProductionTask,
  type PreparedProductionTaskInput,
} from "@/features/production-tasks/server/production-task-repository";
import { observeProductionOperation } from "@/features/production-tasks/server/production-task-observability";

async function requireProductionTaskManager() {
  return requirePlatformUser({ roles: ["administrator", "supervisor"] });
}

async function getManagerContext() {
  const auth = await requireProductionTaskManager();
  const employee =
    await productionTaskEmployeeAdapter.findActiveEmployeeByPlatformUserId(
      auth.platformUser.id,
    );
  if (!employee) throw new ProductionTaskDomainError("active_employee_required");
  return { auth, employee };
}

async function prepareTasks(tasks: ProductionTaskDraftInput[]) {
  const [areas, employees] = await Promise.all([
    listProductionAreas(),
    productionTaskEmployeeAdapter.listActiveEmployees(),
  ]);
  const areaById = new Map(areas.map((area) => [area._id.toHexString(), area]));
  const employeeIds = new Set(employees.map((employee) => employee.employeeId));

  return tasks.map((task): PreparedProductionTaskInput => {
    const area = areaById.get(task.areaId);
    if (!area) throw new ProductionTaskDomainError("area_not_found");
    if (task.assigneeEmployeeIds.some((id) => !employeeIds.has(id))) {
      throw new ProductionTaskDomainError("active_employee_required");
    }

    return {
      ...task,
      areaLabelSnapshot: area.name,
    };
  });
}

async function checkTaskAvailability(
  tasks: Array<{
    assigneeEmployeeIds: Array<ObjectId | string>;
    workDate: string;
  }>,
) {
  const pairs = [
    ...new Map(
      tasks.flatMap((task) =>
        task.assigneeEmployeeIds.map((employeeId) => {
          const input = { employeeId: String(employeeId), workDate: task.workDate };
          return [`${input.employeeId}:${input.workDate}`, input] as const;
        }),
      ),
    ).entries(),
  ];
  const results = new Map<
    string,
    {
      hasApprovedLeave: boolean;
      scheduleStatus: "not_scheduled" | "scheduled" | "unknown";
    }
  >();
  let nextIndex = 0;
  await Promise.all(
    Array.from({ length: Math.min(12, pairs.length) }, async () => {
      while (nextIndex < pairs.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        const [key, input] = pairs[currentIndex]!;
        const result = await productionTaskAvailabilityAdapter
          .check(input)
          .catch(() => ({
            hasApprovedLeave: false,
            scheduleStatus: "unknown" as const,
          }));
        results.set(key, result);
      }
    }),
  );
  return results;
}

export async function createProductionWeekDraftAsManager(weekDate: string) {
  const { auth } = await getManagerContext();
  const weekStart = getMondayForDate(productionDateSchema.parse(weekDate));
  return createOrGetProductionWeekDraft({
    actorPlatformUserId: auth.platformUser.id,
    weekStart,
  });
}

export async function copyProductionWeekAsManager({
  sourcePlanId,
  targetDate,
}: {
  sourcePlanId: string;
  targetDate: string;
}) {
  const { auth } = await getManagerContext();
  productionObjectIdSchema.parse(sourcePlanId);
  const source = await findProductionPlanById(sourcePlanId);
  if (!source) throw new ProductionTaskDomainError("plan_not_found");
  const targetWeekStart = getMondayForDate(targetDate);
  const draft = await createOrGetProductionWeekDraft({
    actorPlatformUserId: auth.platformUser.id,
    weekStart: targetWeekStart,
  });
  if (draft.tasks.length) throw new ProductionTaskDomainError("draft_conflict");
  const tasks = await prepareTasks(
    source.tasks.map((task, index) => {
      const offset = Math.round(
        (new Date(`${task.workDate}T00:00:00.000Z`).valueOf() -
          new Date(`${source.weekStart}T00:00:00.000Z`).valueOf()) /
          86_400_000,
      );
      return productionTaskDraftInputSchema.parse({
        areaId: task.areaId.toHexString(),
        assigneeEmployeeIds: task.assigneeEmployeeIds.map(String),
        description: task.description,
        sortOrder: index,
        subject: task.subject ?? "",
        workDate: addCalendarDays(targetWeekStart, offset),
      });
    }),
  );
  return saveProductionWeekDraft({
    actorPlatformUserId: auth.platformUser.id,
    copiedFromPlanId: source._id.toHexString(),
    expectedVersion: draft.version,
    planId: draft._id.toHexString(),
    tasks,
  });
}

export async function getProductionPlanningDashboard() {
  await requireProductionTaskManager();
  const [areas, plans, templates] = await Promise.all([
    listProductionAreas(),
    listProductionPlans(),
    listProductionTaskTemplates(),
  ]);
  return createProductionPlanningDashboardResult({ areas, plans, templates });
}

export async function getProductionPlanEditor(planId: string) {
  await requireProductionTaskManager();
  productionObjectIdSchema.parse(planId);
  const plan = await findProductionPlanById(planId);
  if (!plan) return null;
  const [areas, employees, revisions, templates] = await Promise.all([
    listProductionAreas(),
    productionTaskEmployeeAdapter.listActiveEmployees(),
    listProductionPlanRevisions(plan.weekStart),
    listProductionTaskTemplates(),
  ]);
  const previous =
    revisions
      .filter((revision) => revision.revision < plan.revision)
      .sort((first, second) => second.revision - first.revision)[0] ?? null;
  const availability = await checkTaskAvailability(plan.tasks);
  const warningEntries = plan.tasks.map((task) => {
    const results = task.assigneeEmployeeIds.map(
      (employeeId) => availability.get(`${employeeId.toHexString()}:${task.workDate}`)!,
    );
    const warnings: ProductionTaskAvailabilityWarning[] = [
      results.some((result) => result.hasApprovedLeave) ? "approved_leave" : null,
      results.some((result) => result.scheduleStatus === "not_scheduled")
        ? "not_scheduled"
        : null,
      results.some((result) => result.scheduleStatus === "unknown")
        ? "availability_unknown"
        : null,
    ].filter((value): value is ProductionTaskAvailabilityWarning => !!value);
    return [task.id.toHexString(), warnings] as const;
  });
  return createProductionPlanEditorResult({
    areas,
    employees,
    plan,
    revisionChanges: compareProductionPlanRevisions(previous, plan),
    templates,
    warnings: new Map(warningEntries),
  });
}

export async function createProductionTaskTemplateAsManager(input: unknown) {
  const { auth } = await getManagerContext();
  const parsed = productionTaskTemplateInputSchema.parse(input);
  const areas = await listProductionAreas();
  const area = areas.find((candidate) => candidate._id.toHexString() === parsed.areaId);
  if (!area) throw new ProductionTaskDomainError("area_not_found");
  return createProductionTaskTemplate({
    actorPlatformUserId: auth.platformUser.id,
    areaLabelSnapshot: area.name,
    input: parsed,
  });
}

export async function archiveProductionTaskTemplateAsManager(templateId: string) {
  const { auth } = await getManagerContext();
  return archiveProductionTaskTemplate({
    actorPlatformUserId: auth.platformUser.id,
    templateId: productionObjectIdSchema.parse(templateId),
  });
}

export async function createProductionAreaAsManager(input: unknown) {
  const { auth } = await getManagerContext();
  return createProductionArea({
    actorPlatformUserId: auth.platformUser.id,
    input: productionAreaInputSchema.parse(input),
  });
}

export async function archiveProductionAreaAsManager(areaId: string) {
  const { auth } = await getManagerContext();
  return archiveProductionArea({
    actorPlatformUserId: auth.platformUser.id,
    areaId: productionObjectIdSchema.parse(areaId),
  });
}

export async function saveProductionWeekDraftAsManager(input: unknown) {
  const { auth } = await getManagerContext();
  const parsed = productionWeekDraftInputSchema.parse(input);
  const plan = await findProductionPlanById(parsed.planId);
  if (!plan || plan.currentSlot !== "draft") {
    throw new ProductionTaskDomainError("draft_not_found");
  }
  if (plan.weekStart !== parsed.weekStart || plan.weekEnd !== parsed.weekEnd) {
    throw new ProductionTaskDomainError("draft_conflict");
  }
  const tasks = await prepareTasks(parsed.tasks);
  return saveProductionWeekDraft({
    actorPlatformUserId: auth.platformUser.id,
    expectedVersion: parsed.expectedVersion,
    planId: parsed.planId,
    tasks,
  });
}

export async function publishProductionWeekAsManager({
  acknowledgeWarnings = false,
  expectedVersion,
  planId,
}: {
  acknowledgeWarnings?: boolean;
  expectedVersion: number;
  planId: string;
}) {
  const { auth } = await getManagerContext();
  productionObjectIdSchema.parse(planId);
  const plan = await findProductionPlanById(planId);
  if (!plan || plan.currentSlot !== "draft") {
    throw new ProductionTaskDomainError("draft_not_found");
  }
  if (plan.tasks.length === 0) {
    throw new ProductionTaskDomainError("publication_invalid");
  }
  const parsedTasks = plan.tasks.map((task) =>
    productionTaskDraftInputSchema.parse({
      areaId: task.areaId.toHexString(),
      assigneeEmployeeIds: task.assigneeEmployeeIds.map(String),
      description: task.description,
      id: task.id.toHexString(),
      sortOrder: task.sortOrder,
      subject: task.subject ?? "",
      workDate: task.workDate,
    }),
  );
  await prepareTasks(parsedTasks);
  const availability = await checkTaskAvailability(plan.tasks);
  if (
    !acknowledgeWarnings &&
    [...availability.values()].some(
      (result) => result.hasApprovedLeave || result.scheduleStatus !== "scheduled",
    )
  ) {
    throw new ProductionTaskDomainError("warnings_unacknowledged");
  }

  return observeProductionOperation(
    "publication",
    () =>
      publishProductionWeekDraft({
        actorPlatformUserId: auth.platformUser.id,
        expectedVersion,
        planId,
      }),
    plan.tasks.length,
  );
}

export async function getPublishedProductionBoard({
  areaId = null,
  assigneeId = null,
  date = getCostaRicaDate(),
  status = null,
  view = "day",
}: ProductionBoardQuery = {}) {
  const { platformUser } = await requirePlatformUser();
  const selectedDate = productionDateSchema.parse(date);
  const weekStart = getMondayForDate(selectedDate);
  const weekEnd = addCalendarDays(weekStart, 6);
  const parsedAreaId = areaId ? productionObjectIdSchema.parse(areaId) : null;
  const parsedAssigneeId = assigneeId
    ? productionObjectIdSchema.parse(assigneeId)
    : null;
  const [areas, currentEmployee, employees, plan] = await Promise.all([
    listProductionAreas(),
    productionTaskEmployeeAdapter.findActiveEmployeeByPlatformUserId(platformUser.id),
    productionTaskEmployeeAdapter.listActiveEmployees(),
    findCurrentPublishedPlan(weekStart),
  ]);

  return createProductionBoardResult({
    areas,
    canManage:
      platformUser.role === "administrator" || platformUser.role === "supervisor",
    currentEmployeeId: currentEmployee?.employeeId ?? null,
    employees,
    plan,
    selectedFilters: {
      areaId: parsedAreaId,
      assigneeId: parsedAssigneeId,
      status,
    },
    selectedDate,
    view,
    weekEnd,
    weekStart,
  });
}

export async function getTodayProductionTaskSummary(): Promise<TodayProductionTaskSummaryResult> {
  const [{ platformUser }, board] = await Promise.all([
    requirePlatformUser(),
    getPublishedProductionBoard({ view: "day" }),
  ]);
  const employee =
    await productionTaskEmployeeAdapter.findActiveEmployeeByPlatformUserId(
      platformUser.id,
    );
  const changes = employee
    ? await listUnreadProductionAssignmentChanges(employee.employeeId)
    : [];
  const tasks = board.currentEmployeeId
    ? board.tasks.filter((task) =>
        task.assigneeEmployeeIds.includes(board.currentEmployeeId!),
      )
    : [];
  return {
    assignmentChanges: {
      count: changes.length,
      weekStart: changes[0]?.weekStart ?? null,
    },
    completedCount: tasks.filter((task) => task.status === "completed").length,
    employees: board.employees,
    pendingCount: tasks.filter((task) => task.status === "pending").length,
    tasks: tasks.slice(0, 5),
  };
}

export async function markProductionAssignmentChangesReadForCurrentUser() {
  const { platformUser } = await requirePlatformUser();
  const employee =
    await productionTaskEmployeeAdapter.findActiveEmployeeByPlatformUserId(
      platformUser.id,
    );
  if (!employee) throw new ProductionTaskDomainError("active_employee_required");
  return markProductionAssignmentChangesRead(employee.employeeId);
}

export async function completeProductionTaskForCurrentUser({
  expectedVersion,
  planId,
  taskId,
}: {
  expectedVersion: number;
  planId: string;
  taskId: string;
}) {
  const { platformUser } = await requirePlatformUser();
  const employee =
    await productionTaskEmployeeAdapter.findActiveEmployeeByPlatformUserId(
      platformUser.id,
    );
  if (!employee) throw new ProductionTaskDomainError("active_employee_required");
  const found = await findTaskInPublishedPlan(planId, taskId);
  if (!found) throw new ProductionTaskDomainError("task_not_found");
  const canManage =
    platformUser.role === "administrator" || platformUser.role === "supervisor";
  const assigned = found.task.assigneeEmployeeIds.some(
    (id) => id.toHexString() === employee.employeeId,
  );
  if (!assigned && !canManage) throw new ProductionTaskDomainError("forbidden");

  return observeProductionOperation("completion", () =>
    transitionProductionTask({
      action: "completed",
      actorEmployeeId: employee.employeeId,
      actorPlatformUserId: platformUser.id,
      expectedVersion,
      planId,
      taskId,
    }),
  );
}

export async function reopenProductionTaskForCurrentUser({
  expectedVersion,
  planId,
  taskId,
}: {
  expectedVersion: number;
  planId: string;
  taskId: string;
}) {
  const { platformUser } = await requirePlatformUser();
  const employee =
    await productionTaskEmployeeAdapter.findActiveEmployeeByPlatformUserId(
      platformUser.id,
    );
  if (!employee) throw new ProductionTaskDomainError("active_employee_required");
  const found = await findTaskInPublishedPlan(planId, taskId);
  if (!found) throw new ProductionTaskDomainError("task_not_found");
  const canManage =
    platformUser.role === "administrator" || platformUser.role === "supervisor";
  const ownSameDayCompletion =
    found.task.completedByEmployeeId?.equals(new ObjectId(employee.employeeId)) &&
    !!found.task.completedAt &&
    getCostaRicaDate(found.task.completedAt) === getCostaRicaDate();
  if (!canManage && !ownSameDayCompletion) {
    throw new ProductionTaskDomainError(
      found.task.completedByEmployeeId?.equals(new ObjectId(employee.employeeId))
        ? "undo_window_closed"
        : "forbidden",
    );
  }

  return observeProductionOperation("reopen", () =>
    transitionProductionTask({
      action: "reopened",
      actorEmployeeId: employee.employeeId,
      actorPlatformUserId: platformUser.id,
      expectedVersion,
      planId,
      taskId,
    }),
  );
}
