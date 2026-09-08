// @vitest-environment node
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { PlanningService } from "@/features/planning/application/planning-service";
import { createOpenAIPlanningModel } from "@/features/planning/server/openai-planning-model";
import { planningRepository } from "@/features/planning/server/planning-repository";
import { getDatabase, getMongoClient } from "@/lib/server/mongodb";

// Explicit opt-in only: sends synthetic tasks to OpenAI and uses a uniquely scoped test workspace.
describe.skipIf(process.env.RUN_PLANNING_LIVE !== "1")(
  "live planning integration",
  () => {
    it("generates through OpenAI, persists and accepts a plan, and records completion", async () => {
      const actor = { id: `planning-smoke-${randomUUID()}`, role: "administrator" };
      const repository = {
        ...planningRepository,
        getContext: async () => ({ version: 0, records: [], updatedAt: "" }),
      };
      const service = new PlanningService(repository, createOpenAIPlanningModel());
      try {
        const draft = await service.generate(actor, {
          version: 0,
          input:
            "Prueba ficticia: revisar una guía de instalación mañana y después redactar un resumen de esa revisión.",
          personalContext: "Tengo dos horas disponibles.",
          horizon: "Esta semana",
          feedback: "",
        });
        expect(draft.proposal?.tasks.length).toBeGreaterThan(0);
        expect(draft.acceptedPlan).toBeNull();
        const reloaded = await service.load(actor);
        expect(reloaded.workspace.proposal?.id).toBe(draft.proposal!.id);
        const accepted = await service.accept(actor, {
          version: draft.version,
          proposalId: draft.proposal!.id,
          tasks: draft.proposal!.tasks,
        });
        const task = accepted.acceptedPlan!.tasks[0]!;
        const done = await service.updateTask(actor, task.id, {
          version: accepted.version,
          status: "done",
          blocker: "",
          completionNote: "Prueba de persistencia",
        });
        expect(done.acceptedPlan?.tasks[0]?.status).toBe("done");
        console.log(
          JSON.stringify({
            model: draft.proposal!.model,
            tasks: draft.proposal!.tasks.length,
            usage: draft.proposal!.usage,
            persisted: true,
          }),
        );
      } finally {
        await (await getDatabase())
          .collection<{ _id: string }>("planning_workspaces")
          .deleteOne({ _id: actor.id });
        await (await getMongoClient()).close();
        globalThis.mongoClientPromise = undefined;
      }
    }, 150000);
  },
);
