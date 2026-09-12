import "server-only";
import type { ClientSession, Db } from "mongodb";

/** Serialize publication, import, and direct editing of the same weeks. */
export async function lockProductionWeeks(
  database: Db,
  session: ClientSession,
  weeks: string[],
) {
  const locks = database.collection<{ _id: string; version: number }>(
    "production_task_week_locks",
  );
  for (const weekStart of [...new Set(weeks)].sort()) {
    await locks.updateOne(
      { _id: weekStart },
      { $inc: { version: 1 } },
      { upsert: true, session },
    );
  }
}
