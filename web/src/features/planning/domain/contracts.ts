import { z } from "zod";

export const taskStatusSchema = z.enum([
  "ready",
  "in_progress",
  "blocked",
  "needs_clarification",
  "done",
  "cancelled",
]);
export const knowledgeKindSchema = z.enum([
  "overview",
  "objective",
  "challenge",
  "constraint",
  "principle",
  "process",
]);
export const knowledgeRecordSchema = z
  .object({
    id: z.string().min(1).max(80),
    kind: knowledgeKindSchema,
    title: z.string().trim().min(1).max(160),
    content: z.string().trim().min(1).max(4000),
    owner: z.string().trim().min(1).max(120),
    reviewedOn: z.iso.date(),
    active: z.boolean(),
  })
  .strict();
export const companyContextSchema = z.object({
  version: z.number().int().nonnegative(),
  records: z.array(knowledgeRecordSchema).max(20),
  updatedAt: z.string(),
});
export const taskSchema = z
  .object({
    id: z.string().min(1).max(80),
    title: z.string().min(1).max(200),
    outcome: z.string().min(1).max(1000),
    nextAction: z.string().min(1).max(1000),
    status: taskStatusSchema,
    priority: z.enum(["high", "medium", "low"]),
    rationale: z.string().min(1).max(1600),
    sourceIds: z.array(z.string()).max(20),
    dependencies: z.array(z.string()).max(40),
    effortMinutes: z.number().int().min(1).max(100000).nullable(),
    dueDate: z.iso.date().nullable(),
    assumptions: z.array(z.string().max(500)).max(10),
    blocker: z.string().max(1000),
    completionNote: z.string().max(1000),
    inputReference: z.string().max(2000),
  })
  .strict();
export const planOutputSchema = z.object({
  summary: z.string().max(3000),
  tasks: z.array(taskSchema).min(1).max(40),
  questions: z.array(z.string().max(500)).max(5),
  warnings: z.array(z.string().max(500)).max(10),
  changes: z.array(z.string().max(500)).max(40),
});
export const proposalSchema = planOutputSchema.extend({
  id: z.string(),
  contextVersion: z.number().int(),
  sources: z.array(knowledgeRecordSchema),
  createdAt: z.string(),
  model: z.string(),
  promptVersion: z.string(),
  usage: z.object({ inputTokens: z.number(), outputTokens: z.number() }),
});
export const workspaceSchema = z.object({
  version: z.number().int().nonnegative(),
  input: z.string(),
  personalContext: z.string(),
  horizon: z.string(),
  proposal: proposalSchema.nullable(),
  acceptedPlan: proposalSchema.nullable(),
  conversation: z.array(
    z.object({ role: z.enum(["user", "assistant"]), content: z.string() }),
  ),
  generatingUntil: z.string().nullable(),
  updatedAt: z.string(),
});
export const bootstrapSchema = z.object({
  workspace: workspaceSchema,
  context: companyContextSchema,
  configured: z.boolean(),
  model: z.string(),
});
export const versionSchema = z.number().int().nonnegative();
export const generateRequestSchema = z
  .object({
    version: versionSchema,
    input: z.string().trim().min(1).max(12000),
    personalContext: z.string().trim().max(3000),
    horizon: z.string().trim().min(1).max(120),
    feedback: z.string().trim().max(3000),
  })
  .strict();
export const saveContextRequestSchema = z
  .object({
    version: versionSchema,
    records: z.array(knowledgeRecordSchema).max(20),
  })
  .strict();
export const acceptRequestSchema = z
  .object({
    version: versionSchema,
    proposalId: z.string().min(1),
    tasks: z.array(taskSchema).min(1).max(40),
  })
  .strict();
export const updateTaskRequestSchema = z
  .object({
    version: versionSchema,
    status: taskStatusSchema,
    blocker: z.string().trim().max(1000),
    completionNote: z.string().trim().max(1000),
  })
  .strict();
export type PlanningTask = z.infer<typeof taskSchema>;
export type CompanyContext = z.infer<typeof companyContextSchema>;
export type KnowledgeRecord = z.infer<typeof knowledgeRecordSchema>;
export type Proposal = z.infer<typeof proposalSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type Bootstrap = z.infer<typeof bootstrapSchema>;
export type GenerateRequest = z.infer<typeof generateRequestSchema>;
export type PlanOutput = z.infer<typeof planOutputSchema>;

export function emptyWorkspace(): Workspace {
  return {
    version: 0,
    input: "",
    personalContext: "",
    horizon: "Esta semana",
    proposal: null,
    acceptedPlan: null,
    conversation: [],
    generatingUntil: null,
    updatedAt: "",
  };
}

export function planningDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Costa_Rica",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export class PlanningError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function validateTasks(tasks: PlanningTask[], sourceIds: string[]) {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  if (byId.size !== tasks.length)
    throw new PlanningError("invalid_plan", "El plan contiene tareas duplicadas.", 422);
  const visited = new Set<string>();
  const visiting = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id))
      throw new PlanningError(
        "invalid_plan",
        "Hay un ciclo entre las dependencias del plan.",
        422,
      );
    if (visited.has(id)) return;
    const task = byId.get(id);
    if (!task)
      throw new PlanningError(
        "invalid_plan",
        "Una dependencia no existe en el plan.",
        422,
      );
    if (task.sourceIds.some((source) => !sourceIds.includes(source)))
      throw new PlanningError(
        "invalid_plan",
        "Una referencia no existe en el contexto autorizado.",
        422,
      );
    visiting.add(id);
    task.dependencies.forEach(visit);
    visiting.delete(id);
    visited.add(id);
  }
  tasks.forEach((task) => visit(task.id));
}

export function isReady(task: PlanningTask, tasks: PlanningTask[]) {
  return (
    (task.status === "ready" || task.status === "in_progress") &&
    task.dependencies.every(
      (id) => tasks.find((other) => other.id === id)?.status === "done",
    )
  );
}
