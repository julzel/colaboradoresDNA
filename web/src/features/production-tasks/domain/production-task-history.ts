import type { ProductionTaskDocument } from "./production-task";
import { ProductionTaskDomainError } from "./shared";

/** Imports and publication must obey the same past-date boundary as direct editing. */
export function assertPastTasksUnchanged(
  previous: ProductionTaskDocument[],
  next: ProductionTaskDocument[],
  today: string,
) {
  const snapshot = (tasks: ProductionTaskDocument[]) =>
    tasks
      .filter((task) => task.workDate < today)
      .map((task) =>
        JSON.stringify({
          id: String(task.id),
          date: task.workDate,
          area: String(task.areaId),
          description: task.description,
          subject: task.subject,
          assignees: task.assigneeEmployeeIds.map(String).sort(),
          status: task.status,
          completedAt: task.completedAt,
          completedBy: task.completedByEmployeeId
            ? String(task.completedByEmployeeId)
            : null,
        }),
      )
      .sort();
  const before = snapshot(previous);
  const after = snapshot(next);
  if (
    before.length !== after.length ||
    before.some((value, index) => value !== after[index])
  )
    throw new ProductionTaskDomainError("task_date_past");
}
