import { describe, expect, it, vi } from "vitest";
import { PlanningService } from "@/features/planning/application/planning-service";
import type {
  PlanningModel,
  PlanningRepository,
  StoredWorkspace,
} from "@/features/planning/application/ports";
import {
  emptyWorkspace,
  PlanningError,
  type CompanyContext,
} from "@/features/planning/domain/contracts";
import { planningContext, planningOutput, planningTask } from "../fixtures/planning";

const actor = { id: "admin-a", role: "administrator" };
const input = {
  version: 0,
  input: "Revisar el proceso",
  personalContext: "",
  horizon: "Esta semana",
  feedback: "",
};

function setup() {
  let context = structuredClone(planningContext);
  let now = new Date("2026-09-07T12:00:00Z");
  const records = new Map<string, StoredWorkspace>();
  const repository: PlanningRepository = {
    async getWorkspace(id) {
      if (!records.has(id))
        records.set(id, {
          ...emptyWorkspace(),
          generationCount: 0,
          generationDay: "",
          lastGenerationAt: null,
        });
      return structuredClone(records.get(id)!);
    },
    async saveWorkspace(id, version, state) {
      if (records.get(id)?.version !== version)
        throw new PlanningError("conflict", "Conflict", 409);
      const next = { ...structuredClone(state), version: version + 1 };
      records.set(id, next);
      return structuredClone(next);
    },
    async getContext() {
      return structuredClone(context);
    },
    async saveContext(version, next) {
      if (version !== context.version)
        throw new PlanningError("conflict", "Conflict", 409);
      context = { ...next, version: version + 1 };
      return context;
    },
  };
  const generate = vi.fn<PlanningModel["generate"]>().mockResolvedValue({
    plan: planningOutput(),
    usage: { inputTokens: 100, outputTokens: 100 },
  });
  const service = new PlanningService(
    repository,
    { name: "test-model", configured: true, generate },
    () => now,
  );
  return {
    service,
    repository,
    generate,
    records,
    setContext: (next: CompanyContext) => {
      context = next;
    },
    advance: () => {
      now = new Date(now.getTime() + 20000);
    },
  };
}

describe("personal planning application", () => {
  it("generates a draft, accepts edits and tracks completion without changing the original input", async () => {
    const { service } = setup();
    const draft = await service.generate(actor, input);
    expect(draft.acceptedPlan).toBeNull();
    expect(draft.proposal?.tasks[0]?.id).not.toBe("new-1");
    const task = { ...draft.proposal!.tasks[0]!, title: "Título revisado" };
    const accepted = await service.accept(actor, {
      version: draft.version,
      proposalId: draft.proposal!.id,
      tasks: [task],
    });
    expect(accepted.proposal).toBeNull();
    const completed = await service.updateTask(actor, task.id, {
      version: accepted.version,
      status: "done",
      blocker: "",
      completionNote: "Validado",
    });
    expect(completed.acceptedPlan?.tasks[0]).toMatchObject({
      title: "Título revisado",
      status: "done",
      completionNote: "Validado",
    });
    expect(completed.input).toBe(input.input);
    await expect(
      service.accept(actor, {
        version: completed.version,
        proposalId: draft.proposal!.id,
        tasks: [task],
      }),
    ).rejects.toMatchObject({ code: "conflict" });
  });

  it("denies collaborators and isolates administrator workspaces", async () => {
    const { service, generate } = setup();
    await expect(
      service.generate({ ...actor, role: "collaborator" }, input),
    ).rejects.toMatchObject({ status: 403 });
    expect(generate).not.toHaveBeenCalled();
    await service.generate(actor, input);
    expect(
      (await service.load({ id: "admin-b", role: "administrator" })).workspace.proposal,
    ).toBeNull();
  });

  it("clears a resolved blocker when work becomes ready or completed", async () => {
    const { service } = setup();
    const draft = await service.generate(actor, input);
    const accepted = await service.accept(actor, {
      version: draft.version,
      proposalId: draft.proposal!.id,
      tasks: draft.proposal!.tasks,
    });
    const task = accepted.acceptedPlan!.tasks[0]!;
    const blocked = await service.updateTask(actor, task.id, {
      version: accepted.version,
      status: "blocked",
      blocker: "Esperando confirmación",
      completionNote: "",
    });
    expect(blocked.acceptedPlan?.tasks[0]?.blocker).toBe("Esperando confirmación");
    const ready = await service.updateTask(actor, task.id, {
      version: blocked.version,
      status: "ready",
      blocker: "Esperando confirmación",
      completionNote: "Confirmación recibida",
    });
    expect(ready.acceptedPlan?.tasks[0]?.blocker).toBe("");
    const completed = await service.updateTask(actor, task.id, {
      version: ready.version,
      status: "done",
      blocker: "Texto anterior",
      completionNote: "Completado",
    });
    expect(completed.acceptedPlan?.tasks[0]?.blocker).toBe("");
  });

  it("rejects stale versions before spending tokens and prevents concurrent generation", async () => {
    const { service, generate } = setup();
    const pending =
      Promise.withResolvers<Awaited<ReturnType<PlanningModel["generate"]>>>();
    generate.mockReturnValue(pending.promise);
    const first = service.generate(actor, input);
    await vi.waitFor(() => expect(generate).toHaveBeenCalledTimes(1));
    await expect(service.generate(actor, input)).rejects.toMatchObject({
      code: "conflict",
    });
    await expect(
      service.generate(actor, { ...input, version: 1 }),
    ).rejects.toMatchObject({ code: "busy" });
    pending.resolve({
      plan: planningOutput(),
      usage: { inputTokens: 1, outputTokens: 1 },
    });
    await first;
  });

  it("preserves accepted work and releases the generation reservation after provider failure", async () => {
    const { service, generate, advance } = setup();
    const draft = await service.generate(actor, input);
    const accepted = await service.accept(actor, {
      version: draft.version,
      proposalId: draft.proposal!.id,
      tasks: draft.proposal!.tasks,
    });
    advance();
    generate.mockRejectedValue(new Error("Provider failed"));
    await expect(
      service.generate(actor, {
        ...input,
        version: accepted.version,
        feedback: "Nueva información",
      }),
    ).rejects.toThrow("Provider failed");
    const current = (await service.load(actor)).workspace;
    expect(current.acceptedPlan).toEqual(accepted.acceptedPlan);
    expect(current.generatingUntil).toBeNull();
  });

  it("rejects fabricated sources, cycles and dropped tasks", async () => {
    const { service, generate, advance } = setup();
    generate.mockResolvedValueOnce({
      plan: planningOutput([{ ...planningTask(), sourceIds: ["invented"] }]),
      usage: { inputTokens: 1, outputTokens: 1 },
    });
    await expect(service.generate(actor, input)).rejects.toMatchObject({
      code: "invalid_plan",
    });
    advance();
    const version = (await service.load(actor)).workspace.version;
    generate.mockResolvedValueOnce({
      plan: planningOutput([{ ...planningTask(), dependencies: ["new-1"] }]),
      usage: { inputTokens: 1, outputTokens: 1 },
    });
    await expect(service.generate(actor, { ...input, version })).rejects.toMatchObject({
      code: "invalid_plan",
    });
    advance();
    const draft = await service.generate(actor, {
      ...input,
      version: (await service.load(actor)).workspace.version,
    });
    advance();
    await expect(
      service.generate(actor, { ...input, version: draft.version }),
    ).rejects.toMatchObject({ code: "invalid_plan" });
  });

  it("retains task IDs and completed progress during conversational revision", async () => {
    const { service, generate, advance } = setup();
    const draft = await service.generate(actor, input);
    const accepted = await service.accept(actor, {
      version: draft.version,
      proposalId: draft.proposal!.id,
      tasks: draft.proposal!.tasks,
    });
    const task = accepted.acceptedPlan!.tasks[0]!;
    const completed = await service.updateTask(actor, task.id, {
      version: accepted.version,
      status: "done",
      blocker: "",
      completionNote: "Hecho",
    });
    advance();
    generate.mockResolvedValue({
      plan: planningOutput([{ ...task, status: "ready" }, planningTask("new-2")]),
      usage: { inputTokens: 1, outputTokens: 1 },
    });
    const revised = await service.generate(actor, {
      ...input,
      version: completed.version,
      feedback: "Agregar otra revisión",
    });
    expect(revised.proposal!.tasks[0]).toMatchObject({
      id: task.id,
      status: "done",
      completionNote: "Hecho",
    });
    expect(revised.conversation.at(-2)?.content).toBe("Agregar otra revisión");
  });

  it("requires fresh company context and validates blockers and dependencies", async () => {
    const { service, generate, setContext } = setup();
    generate.mockResolvedValue({
      plan: planningOutput([
        planningTask(),
        { ...planningTask("new-2"), dependencies: ["new-1"] },
      ]),
      usage: { inputTokens: 1, outputTokens: 1 },
    });
    const draft = await service.generate(actor, input);
    setContext({ ...planningContext, version: 2 });
    await expect(
      service.accept(actor, {
        version: draft.version,
        proposalId: draft.proposal!.id,
        tasks: draft.proposal!.tasks,
      }),
    ).rejects.toMatchObject({ code: "context_changed" });
    setContext(planningContext);
    const accepted = await service.accept(actor, {
      version: draft.version,
      proposalId: draft.proposal!.id,
      tasks: draft.proposal!.tasks,
    });
    await expect(
      service.updateTask(actor, accepted.acceptedPlan!.tasks[1]!.id, {
        version: accepted.version,
        status: "in_progress",
        blocker: "",
        completionNote: "",
      }),
    ).rejects.toMatchObject({ code: "dependency" });
    await expect(
      service.updateTask(actor, accepted.acceptedPlan!.tasks[0]!.id, {
        version: accepted.version,
        status: "blocked",
        blocker: "",
        completionNote: "",
      }),
    ).rejects.toMatchObject({ code: "invalid_task" });
  });

  it("marks plans provisional without objectives and limits daily generation", async () => {
    const { service, generate, setContext, records } = setup();
    setContext({ ...planningContext, records: [] });
    generate.mockResolvedValue({
      plan: planningOutput([{ ...planningTask(), sourceIds: [] }]),
      usage: { inputTokens: 1, outputTokens: 1 },
    });
    const draft = await service.generate(actor, input);
    expect(draft.proposal?.warnings.join(" ")).toContain("provisional");
    records.set(actor.id, {
      ...records.get(actor.id)!,
      generationCount: 50,
      lastGenerationAt: null,
    });
    await expect(
      service.generate(actor, { ...input, version: draft.version }),
    ).rejects.toMatchObject({ code: "rate_limit" });
  });
});
