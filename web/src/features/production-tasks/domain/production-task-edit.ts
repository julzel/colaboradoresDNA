import { z } from "zod";
import { productionTaskDraftInputSchema } from "./production-task";
import { ProductionTaskDomainError, productionObjectIdSchema } from "./shared";

const sourceSchema = z
  .object({
    planId: productionObjectIdSchema,
    taskId: productionObjectIdSchema,
    expectedTaskVersion: z.number().int().positive(),
  })
  .strict();
export const taskEditCommandSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("create"),
      task: productionTaskDraftInputSchema,
      expectedTargetPlanId: productionObjectIdSchema.nullable(),
      acknowledgeWarnings: z.boolean().default(false),
    })
    .strict(),
  z
    .object({
      action: z.literal("update"),
      source: sourceSchema,
      task: productionTaskDraftInputSchema,
      expectedTargetPlanId: productionObjectIdSchema.nullable(),
      acknowledgeWarnings: z.boolean().default(false),
    })
    .strict(),
  z.object({ action: z.literal("remove"), source: sourceSchema }).strict(),
]);
export type TaskEditCommand = z.output<typeof taskEditCommandSchema>;

export class TaskAvailabilityError extends ProductionTaskDomainError {
  constructor(public readonly warnings: string[]) {
    super("warnings_unacknowledged");
  }
}

export function requireEditableTaskDate(date: string, today: string) {
  if (date < today) throw new ProductionTaskDomainError("task_date_past");
}
