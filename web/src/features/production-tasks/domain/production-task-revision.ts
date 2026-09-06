import type {
  ProductionTaskDocument,
  ProductionWeekPlanDocument,
} from "@/features/production-tasks/domain/production-task";

export type ProductionTaskRevisionChangeType =
  | "added"
  | "removed"
  | "reassigned"
  | "rescheduled"
  | "edited";

export type ProductionTaskRevisionChange = {
  affectedEmployeeIds: string[];
  description: string;
  taskId: string;
  type: ProductionTaskRevisionChangeType;
};

function sortedIds(task: ProductionTaskDocument) {
  return task.assigneeEmployeeIds.map(String).sort();
}

function sameIds(first: string[], second: string[]) {
  return (
    first.length === second.length && first.every((id, index) => id === second[index])
  );
}

export function compareProductionPlanRevisions(
  previous: ProductionWeekPlanDocument | null,
  current: ProductionWeekPlanDocument,
): ProductionTaskRevisionChange[] {
  const previousById = new Map(
    (previous?.tasks ?? []).map((task) => [task.id.toHexString(), task]),
  );
  const currentById = new Map(
    current.tasks.map((task) => [task.id.toHexString(), task]),
  );
  const changes: ProductionTaskRevisionChange[] = [];

  for (const task of current.tasks) {
    const taskId = task.id.toHexString();
    const prior = previousById.get(taskId);
    if (!prior) {
      changes.push({
        affectedEmployeeIds: sortedIds(task),
        description: task.description,
        taskId,
        type: "added",
      });
      continue;
    }

    const priorAssignees = sortedIds(prior);
    const currentAssignees = sortedIds(task);
    if (!sameIds(priorAssignees, currentAssignees)) {
      changes.push({
        affectedEmployeeIds: [...new Set([...priorAssignees, ...currentAssignees])],
        description: task.description,
        taskId,
        type: "reassigned",
      });
    }
    if (prior.workDate !== task.workDate) {
      changes.push({
        affectedEmployeeIds: currentAssignees,
        description: task.description,
        taskId,
        type: "rescheduled",
      });
    }
    if (
      prior.areaId.toHexString() !== task.areaId.toHexString() ||
      prior.description !== task.description ||
      prior.subject !== task.subject
    ) {
      changes.push({
        affectedEmployeeIds: currentAssignees,
        description: task.description,
        taskId,
        type: "edited",
      });
    }
  }

  for (const task of previous?.tasks ?? []) {
    const taskId = task.id.toHexString();
    if (!currentById.has(taskId)) {
      changes.push({
        affectedEmployeeIds: sortedIds(task),
        description: task.description,
        taskId,
        type: "removed",
      });
    }
  }

  return changes;
}
