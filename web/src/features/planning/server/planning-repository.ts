import "server-only";

import { getDatabase } from "@/lib/server/mongodb";
import {
  emptyWorkspace,
  PlanningError,
  type CompanyContext,
} from "../domain/contracts";
import type { PlanningRepository, StoredWorkspace } from "../application/ports";

type WorkspaceDocument = StoredWorkspace & { _id: string };
type ContextDocument = CompanyContext & { _id: string };

// The built-in unique _id index scopes one workspace per authenticated platform user.
// No employee or development collections are read by this feature.
export const planningRepository: PlanningRepository = {
  async getWorkspace(ownerId) {
    const collection = (await getDatabase()).collection<WorkspaceDocument>(
      "planning_workspaces",
    );
    const initial = {
      ...emptyWorkspace(),
      generationCount: 0,
      generationDay: "",
      lastGenerationAt: null,
    };
    await collection.updateOne(
      { _id: ownerId },
      { $setOnInsert: initial },
      { upsert: true },
    );
    const document = await collection.findOne({ _id: ownerId });
    if (!document) throw new Error("Workspace initialization failed");
    const { _id: _owner, ...workspace } = document;
    void _owner;
    return workspace;
  },
  async saveWorkspace(ownerId, expectedVersion, workspace) {
    const next = {
      ...workspace,
      version: expectedVersion + 1,
      updatedAt: new Date().toISOString(),
    };
    const result = await (await getDatabase())
      .collection<WorkspaceDocument>("planning_workspaces")
      .replaceOne({ _id: ownerId, version: expectedVersion }, next);
    if (!result.matchedCount)
      throw new PlanningError(
        "conflict",
        "El plan cambió en otra sesión. Recargá antes de continuar.",
        409,
      );
    return next;
  },
  async getContext() {
    const collection = (await getDatabase()).collection<ContextDocument>(
      "planning_context",
    );
    await collection.updateOne(
      { _id: "dnature" },
      { $setOnInsert: { version: 0, records: [], updatedAt: "" } },
      { upsert: true },
    );
    const document = await collection.findOne({ _id: "dnature" });
    if (!document) throw new Error("Context initialization failed");
    const { _id: _company, ...context } = document;
    void _company;
    return context;
  },
  async saveContext(expectedVersion, context) {
    await this.getContext();
    const next = { ...context, version: expectedVersion + 1 };
    const result = await (await getDatabase())
      .collection<ContextDocument>("planning_context")
      .replaceOne({ _id: "dnature", version: expectedVersion }, next);
    if (!result.matchedCount)
      throw new PlanningError(
        "conflict",
        "Otra persona actualizó el contexto. Recargá antes de guardar.",
        409,
      );
    return next;
  },
};
