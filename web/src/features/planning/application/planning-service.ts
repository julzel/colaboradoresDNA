import { randomUUID } from "node:crypto";
import type { z } from "zod";
import {
  acceptRequestSchema,
  generateRequestSchema,
  isReady,
  PlanningError,
  planOutputSchema,
  planningDate,
  proposalSchema,
  saveContextRequestSchema,
  updateTaskRequestSchema,
  validateTasks,
  workspaceSchema,
  type PlanningTask,
} from "../domain/contracts";
import type { PlanningActor, PlanningModel, PlanningRepository } from "./ports";

export const PROMPT_VERSION = "planning-v1";

export class PlanningService {
  constructor(
    private repository: PlanningRepository,
    private model: PlanningModel,
    private now = () => new Date(),
  ) {}

  private authorize(actor: PlanningActor) {
    if (!actor.id || actor.role !== "administrator")
      throw new PlanningError("forbidden", "No tenés acceso a este planificador.", 403);
  }

  private async current(actor: PlanningActor, version: number) {
    this.authorize(actor);
    const workspace = await this.repository.getWorkspace(actor.id);
    if (workspace.version !== version)
      throw new PlanningError(
        "conflict",
        "El plan cambió en otra sesión. Recargá antes de continuar.",
        409,
      );
    if (
      workspace.generatingUntil &&
      workspace.generatingUntil > this.now().toISOString()
    )
      throw new PlanningError(
        "busy",
        "Ya se está preparando una propuesta. Esperá un momento.",
        409,
      );
    return workspace;
  }

  async load(actor: PlanningActor) {
    this.authorize(actor);
    const [workspace, context] = await Promise.all([
      this.repository.getWorkspace(actor.id),
      this.repository.getContext(),
    ]);
    return {
      workspace: workspaceSchema.parse(workspace),
      context,
      model: this.model.name,
      configured: this.model.configured,
    };
  }

  async saveContext(actor: PlanningActor, raw: unknown) {
    this.authorize(actor);
    const input = saveContextRequestSchema.parse(raw);
    if (new Set(input.records.map((record) => record.id)).size !== input.records.length)
      throw new PlanningError("invalid_context", "Hay referencias duplicadas.");
    if (input.records.reduce((sum, record) => sum + record.content.length, 0) > 24000)
      throw new PlanningError(
        "invalid_context",
        "El contexto debe tener menos de 24 000 caracteres.",
      );
    if (input.records.some((record) => record.reviewedOn > planningDate(this.now())))
      throw new PlanningError(
        "invalid_context",
        "La fecha de revisión no puede estar en el futuro.",
      );
    return this.repository.saveContext(input.version, {
      ...input,
      updatedAt: this.now().toISOString(),
    });
  }

  async generate(actor: PlanningActor, raw: unknown) {
    this.authorize(actor);
    const request = generateRequestSchema.parse(raw);
    const workspace = await this.current(actor, request.version);
    if (!this.model.configured)
      throw new PlanningError(
        "not_configured",
        "El servicio de planificación todavía no está configurado.",
        503,
      );
    const today = planningDate(this.now());
    const quotaDay = this.now().toISOString().slice(0, 10);
    const count = workspace.generationDay === quotaDay ? workspace.generationCount : 0;
    if (
      count >= 50 ||
      (workspace.lastGenerationAt &&
        this.now().getTime() - Date.parse(workspace.lastGenerationAt) < 10000)
    )
      throw new PlanningError(
        "rate_limit",
        "Alcanzaste el límite de consultas. Intentá de nuevo más tarde.",
        429,
      );
    const context = await this.repository.getContext();
    const reserved = await this.repository.saveWorkspace(actor.id, workspace.version, {
      ...workspace,
      input: request.input,
      personalContext: request.personalContext,
      horizon: request.horizon,
      generationDay: quotaDay,
      generationCount: count + 1,
      lastGenerationAt: this.now().toISOString(),
      generatingUntil: new Date(this.now().getTime() + 150000).toISOString(),
    });
    try {
      const result = await this.model.generate({ request, workspace, context, today });
      const plan = planOutputSchema.parse(result.plan);
      const previousTasks =
        workspace.proposal?.tasks ?? workspace.acceptedPlan?.tasks ?? [];
      const allPrevious = new Map(
        [...previousTasks, ...(workspace.acceptedPlan?.tasks ?? [])].map((task) => [
          task.id,
          task,
        ]),
      );
      for (const task of allPrevious.values()) {
        if (!plan.tasks.some((candidate) => candidate.id === task.id))
          throw new PlanningError(
            "invalid_plan",
            "La propuesta omitió una tarea existente. Intentá de nuevo.",
            422,
          );
      }
      const activeSources = context.records.filter((record) => record.active);
      validateTasks(
        plan.tasks,
        activeSources.map((record) => record.id),
      );
      const idMap = new Map(
        plan.tasks.map((task) => [
          task.id,
          allPrevious.has(task.id) ? task.id : randomUUID(),
        ]),
      );
      const tasks = plan.tasks.map((task) => {
        const accepted = workspace.acceptedPlan?.tasks.find(
          (candidate) => candidate.id === task.id,
        );
        return {
          ...task,
          id: idMap.get(task.id)!,
          dependencies: task.dependencies.map((id) => idMap.get(id)!),
          ...(accepted
            ? {
                status: accepted.status,
                completionNote: accepted.completionNote,
                blocker: accepted.blocker,
              }
            : {}),
          ...(accepted && ["done", "cancelled"].includes(accepted.status)
            ? {
                title: accepted.title,
                outcome: accepted.outcome,
                nextAction: accepted.nextAction,
              }
            : {}),
        };
      });
      if (!activeSources.some((record) => record.kind === "objective"))
        plan.warnings.unshift(
          "No hay objetivos de empresa registrados. La propuesta es provisional.",
        );
      if (
        activeSources.some(
          (record) => Date.parse(today) - Date.parse(record.reviewedOn) > 90 * 86400000,
        )
      )
        plan.warnings.unshift(
          "Algunas referencias llevan más de 90 días sin revisión. Confirmá su vigencia.",
        );
      const proposal = proposalSchema.parse({
        ...plan,
        warnings: [...new Set(plan.warnings)].slice(0, 10),
        tasks,
        id: randomUUID(),
        contextVersion: context.version,
        sources: activeSources,
        createdAt: this.now().toISOString(),
        model: this.model.name,
        promptVersion: PROMPT_VERSION,
        usage: result.usage,
      });
      const conversation = [
        ...workspace.conversation,
        { role: "user" as const, content: request.feedback || request.input },
        { role: "assistant" as const, content: plan.summary },
      ].slice(-20);
      return workspaceSchema.parse(
        await this.repository.saveWorkspace(actor.id, reserved.version, {
          ...reserved,
          proposal,
          conversation,
          generatingUntil: null,
        }),
      );
    } catch (error) {
      // Only release our own reservation; never overwrite a more recent session.
      await this.repository
        .saveWorkspace(actor.id, reserved.version, {
          ...reserved,
          generatingUntil: null,
        })
        .catch(() => undefined);
      throw error;
    }
  }

  async accept(actor: PlanningActor, raw: unknown) {
    this.authorize(actor);
    const input = acceptRequestSchema.parse(raw);
    const workspace = await this.current(actor, input.version);
    const proposal = workspace.proposal;
    if (!proposal || proposal.id !== input.proposalId)
      throw new PlanningError(
        "conflict",
        "La propuesta ya cambió o fue aceptada.",
        409,
      );
    const context = await this.repository.getContext();
    if (context.version !== proposal.contextVersion)
      throw new PlanningError(
        "context_changed",
        "El contexto cambió. Generá una propuesta nueva antes de aceptar.",
        409,
      );
    if (
      input.tasks.length !== proposal.tasks.length ||
      input.tasks.some(
        (task) => !proposal.tasks.some((original) => original.id === task.id),
      )
    )
      throw new PlanningError(
        "invalid_plan",
        "Conservá todas las tareas de la propuesta; podés cancelarlas después.",
        422,
      );
    validateTasks(
      input.tasks,
      proposal.sources.map((record) => record.id),
    );
    const tasks = input.tasks.map((task) => {
      const accepted = workspace.acceptedPlan?.tasks.find(
        (existing) => existing.id === task.id,
      );
      return accepted
        ? {
            ...task,
            status: accepted.status,
            completionNote: accepted.completionNote,
            blocker: accepted.blocker,
          }
        : task;
    });
    return workspaceSchema.parse(
      await this.repository.saveWorkspace(actor.id, workspace.version, {
        ...workspace,
        acceptedPlan: { ...proposal, tasks },
        proposal: null,
        conversation: [
          ...workspace.conversation,
          { role: "user" as const, content: "Plan revisado y aceptado." },
        ].slice(-20),
      }),
    );
  }

  async updateTask(actor: PlanningActor, taskId: string, raw: unknown) {
    this.authorize(actor);
    const input = updateTaskRequestSchema.parse(raw);
    const workspace = await this.current(actor, input.version);
    const plan = workspace.acceptedPlan;
    const task = plan?.tasks.find((candidate) => candidate.id === taskId);
    if (!plan || !task)
      throw new PlanningError("not_found", "La tarea no existe en tu plan.", 404);
    if (input.status === "blocked" && !input.blocker)
      throw new PlanningError("invalid_task", "Indicá qué está bloqueando la tarea.");
    const updated: PlanningTask = { ...task, ...this.progress(input) };
    if (input.status === "in_progress" && !isReady(updated, plan.tasks))
      throw new PlanningError(
        "dependency",
        "Completá las dependencias antes de iniciar esta tarea.",
        422,
      );
    // A progress change invalidates an older proposal rather than losing the update on acceptance.
    return workspaceSchema.parse(
      await this.repository.saveWorkspace(actor.id, workspace.version, {
        ...workspace,
        proposal: null,
        acceptedPlan: {
          ...plan,
          tasks: plan.tasks.map((candidate) =>
            candidate.id === taskId ? updated : candidate,
          ),
        },
      }),
    );
  }

  private progress(input: z.infer<typeof updateTaskRequestSchema>) {
    return {
      status: input.status,
      blocker:
        input.status === "blocked" || input.status === "needs_clarification"
          ? input.blocker
          : "",
      completionNote: input.completionNote,
    };
  }
}
