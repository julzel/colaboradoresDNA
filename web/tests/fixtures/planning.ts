import type {
  CompanyContext,
  PlanningTask,
  PlanOutput,
} from "@/features/planning/domain/contracts";

export const planningContext: CompanyContext = {
  version: 1,
  updatedAt: "2026-09-07T12:00:00Z",
  records: [
    {
      id: "objective-1",
      kind: "objective",
      title: "Objetivo de prueba",
      content: "Reducir errores de un proceso ficticio.",
      owner: "Revisor de prueba",
      reviewedOn: "2026-09-07",
      active: true,
    },
  ],
};
export function planningTask(id = "new-1"): PlanningTask {
  return {
    id,
    title: "Revisar el proceso",
    outcome: "Lista de errores validada",
    nextAction: "Revisar un ejemplo",
    status: "ready",
    priority: "high",
    rationale: "Permite identificar la causa del problema.",
    sourceIds: ["objective-1"],
    dependencies: [],
    effortMinutes: null,
    dueDate: null,
    assumptions: [],
    blocker: "",
    completionNote: "",
    inputReference: "Revisar el proceso",
  };
}
export function planningOutput(tasks = [planningTask()]): PlanOutput {
  return {
    summary: "Primero revisá el proceso.",
    tasks,
    questions: [],
    warnings: [],
    changes: [],
  };
}
