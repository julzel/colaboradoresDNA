import "server-only";

import { getDatabase } from "@/lib/server/mongodb";

declare global {
  var productionTaskModelReadyPromise: Promise<void> | undefined;
}

/**
 * Runtime repositories await this boundary so migrations remain explicit.
 * Indexes and default areas are owned by bootstrap-production-tasks-model.mjs;
 * application credentials do not need schema-administration privileges.
 */
export function ensureProductionTaskIndexes() {
  if (!globalThis.productionTaskModelReadyPromise) {
    globalThis.productionTaskModelReadyPromise = (async () => {
      const database = await getDatabase();
      const hasArea = await database
        .collection("production_areas")
        .findOne({ status: "active" }, { projection: { _id: 1 } });
      if (!hasArea) {
        throw new Error("Production task model bootstrap is required.");
      }
    })().catch((error: unknown) => {
      globalThis.productionTaskModelReadyPromise = undefined;
      throw error;
    });
  }
  return globalThis.productionTaskModelReadyPromise;
}
