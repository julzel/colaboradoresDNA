import { z } from "zod";
import {
  bootstrapSchema,
  companyContextSchema,
  workspaceSchema,
  type GenerateRequest,
  type PlanningTask,
  type KnowledgeRecord,
} from "../domain/contracts";

export class PlanningApiError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
) {
  const response = await fetch(`/api/planning/v1/${path}`, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    ...(signal ? { signal } : {}),
  });
  const payload = await response.json();
  if (!response.ok)
    throw new PlanningApiError(
      payload.error?.message || "No se pudo completar la solicitud.",
      payload.error?.code || "unknown",
    );
  return schema.parse(payload.data);
}

export const planningApi = {
  load: (signal?: AbortSignal) =>
    request("workspace", bootstrapSchema, "GET", undefined, signal),
  saveContext: (version: number, records: KnowledgeRecord[]) =>
    request("context", companyContextSchema, "PUT", { version, records }),
  generate: (input: GenerateRequest) =>
    request("proposals", workspaceSchema, "POST", input),
  accept: (version: number, proposalId: string, tasks: PlanningTask[]) =>
    request("plan", workspaceSchema, "PUT", { version, proposalId, tasks }),
  updateTask: (version: number, task: PlanningTask) =>
    request(`tasks/${encodeURIComponent(task.id)}`, workspaceSchema, "PATCH", {
      version,
      status: task.status,
      blocker: task.blocker,
      completionNote: task.completionNote,
    }),
};
