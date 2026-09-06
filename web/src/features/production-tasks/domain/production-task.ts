import { ObjectId } from "mongodb";
import { z } from "zod";

import {
  COSTA_RICA_TIMEZONE,
  addCalendarDays,
  normalizeProductionText,
  productionDateSchema,
  productionObjectIdSchema,
  productionWeekStartSchema,
} from "@/features/production-tasks/domain/shared";
import type { ProductionTaskRevisionChangeType } from "@/features/production-tasks/domain/production-task-revision";

export const productionPlanStatusSchema = z.enum(["draft", "published", "superseded"]);
export const productionTaskStatusSchema = z.enum(["pending", "completed"]);

const optionalTextSchema = z
  .string()
  .transform(normalizeProductionText)
  .transform((value) => (value.length ? value : null))
  .pipe(z.string().max(240).nullable());

const taskDescriptionSchema = z
  .string()
  .transform(normalizeProductionText)
  .pipe(
    z
      .string()
      .min(2, "Describí la tarea.")
      .max(500, "La tarea no puede superar 500 caracteres."),
  );

export const productionTaskTemplateInputSchema = z.object({
  areaId: productionObjectIdSchema,
  description: taskDescriptionSchema,
  subject: optionalTextSchema,
});

export const productionAreaInputSchema = z.object({
  name: z
    .string()
    .transform(normalizeProductionText)
    .pipe(z.string().min(2, "Ingresá el nombre del área.").max(80)),
});

export const productionTaskDraftInputSchema = z
  .object({
    areaId: productionObjectIdSchema,
    assigneeEmployeeIds: z
      .array(productionObjectIdSchema)
      .min(1, "Asigná al menos una persona.")
      .max(30, "Una tarea no puede tener más de 30 personas asignadas."),
    description: taskDescriptionSchema,
    id: productionObjectIdSchema.optional(),
    sortOrder: z.coerce.number().int().min(0).max(10_000),
    subject: optionalTextSchema,
    workDate: productionDateSchema,
  })
  .transform((task) => ({
    ...task,
    assigneeEmployeeIds: [...new Set(task.assigneeEmployeeIds)],
  }));

export const productionWeekDraftInputSchema = z
  .object({
    expectedVersion: z.coerce.number().int().min(1),
    planId: productionObjectIdSchema,
    tasks: z.array(productionTaskDraftInputSchema).max(500),
    weekEnd: productionDateSchema,
    weekStart: productionWeekStartSchema,
  })
  .superRefine((input, context) => {
    if (input.weekEnd !== addCalendarDays(input.weekStart, 6)) {
      context.addIssue({
        code: "custom",
        message: "La semana debe cubrir exactamente siete días.",
        path: ["weekEnd"],
      });
    }

    const seenTaskIds = new Set<string>();
    input.tasks.forEach((task, index) => {
      if (task.workDate < input.weekStart || task.workDate > input.weekEnd) {
        context.addIssue({
          code: "custom",
          message: "La fecha de la tarea está fuera de la semana.",
          path: ["tasks", index, "workDate"],
        });
      }
      if (task.id) {
        if (seenTaskIds.has(task.id)) {
          context.addIssue({
            code: "custom",
            message: "Una tarea no puede repetirse dentro del borrador.",
            path: ["tasks", index, "id"],
          });
        }
        seenTaskIds.add(task.id);
      }
    });
  });

export type ProductionPlanStatus = z.infer<typeof productionPlanStatusSchema>;
export type ProductionTaskStatus = z.infer<typeof productionTaskStatusSchema>;
export type ProductionTaskDraftInput = z.output<typeof productionTaskDraftInputSchema>;
export type ProductionWeekDraftInput = z.output<typeof productionWeekDraftInputSchema>;
export type ProductionTaskTemplateInput = z.output<
  typeof productionTaskTemplateInputSchema
>;
export type ProductionAreaInput = z.output<typeof productionAreaInputSchema>;

export type ProductionTaskImportSourceDocument = {
  importId: ObjectId;
  rowNumber: number;
  sheetName: string;
};

export type ProductionTaskDocument = {
  areaId: ObjectId;
  areaLabelSnapshot: string;
  assigneeEmployeeIds: ObjectId[];
  completedAt: Date | null;
  completedByEmployeeId: ObjectId | null;
  description: string;
  id: ObjectId;
  sortOrder: number;
  source: ProductionTaskImportSourceDocument | null;
  status: ProductionTaskStatus;
  subject: string | null;
  version: number;
  workDate: string;
};

export type ProductionWeekPlanDocument = {
  _id: ObjectId;
  copiedFromPlanId: ObjectId | null;
  createdAt: Date;
  createdByPlatformUserId: ObjectId;
  currentSlot: "draft" | "published" | null;
  publishedAt: Date | null;
  publishedByPlatformUserId: ObjectId | null;
  revision: number;
  status: ProductionPlanStatus;
  tasks: ProductionTaskDocument[];
  timezone: typeof COSTA_RICA_TIMEZONE;
  updatedAt: Date;
  updatedByPlatformUserId: ObjectId;
  version: number;
  weekEnd: string;
  weekStart: string;
};

export type ProductionAreaDocument = {
  _id: ObjectId;
  createdAt: Date;
  name: string;
  normalizedName: string;
  sortOrder: number;
  status: "active" | "inactive";
  updatedAt: Date;
};

export type ProductionTaskActivityDocument = {
  _id: ObjectId;
  action: "completed" | "reopened";
  performedAt: Date;
  performedByEmployeeId: ObjectId;
  planId: ObjectId;
  taskId: ObjectId;
  taskVersion: number;
};

export type ProductionTaskTemplateDocument = {
  _id: ObjectId;
  areaId: ObjectId;
  areaLabelSnapshot: string;
  createdAt: Date;
  createdByPlatformUserId: ObjectId;
  description: string;
  status: "active" | "archived";
  subject: string | null;
  updatedAt: Date;
  updatedByPlatformUserId: ObjectId;
  version: number;
};

export type ProductionTaskAssignmentChangeDocument = {
  _id: ObjectId;
  changeType: ProductionTaskRevisionChangeType;
  createdAt: Date;
  employeeId: ObjectId;
  planId: ObjectId;
  readAt: Date | null;
  revision: number;
  taskId: ObjectId;
  weekStart: string;
};

export function createEmptyWeekDraft({
  actorPlatformUserId,
  revision,
  weekStart,
}: {
  actorPlatformUserId: string;
  revision: number;
  weekStart: string;
}): ProductionWeekPlanDocument {
  const parsedStart = productionWeekStartSchema.parse(weekStart);
  const now = new Date();

  return {
    _id: new ObjectId(),
    copiedFromPlanId: null,
    createdAt: now,
    createdByPlatformUserId: new ObjectId(actorPlatformUserId),
    currentSlot: "draft",
    publishedAt: null,
    publishedByPlatformUserId: null,
    revision,
    status: "draft",
    tasks: [],
    timezone: COSTA_RICA_TIMEZONE,
    updatedAt: now,
    updatedByPlatformUserId: new ObjectId(actorPlatformUserId),
    version: 1,
    weekEnd: addCalendarDays(parsedStart, 6),
    weekStart: parsedStart,
  };
}
