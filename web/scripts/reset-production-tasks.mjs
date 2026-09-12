import { MongoClient, BSON } from "mongodb";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, writeFile, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    "expected-database": { type: "string" },
    "expected-host": { type: "string" },
    apply: { type: "boolean", default: false },
  },
});
const databaseName = process.env.MONGODB_DB;
const host = new URL(process.env.MONGODB_URI).hostname;
if (
  !values["expected-database"] ||
  !values["expected-host"] ||
  databaseName !== values["expected-database"] ||
  host !== values["expected-host"]
)
  throw new Error(
    "The configured database/host must match both explicit expected targets.",
  );

// Keep areas, reusable templates, employee records, and their separate audit collections.
const collections = [
  "production_week_plans",
  "production_task_assignment_changes",
  "production_task_activity",
  "production_task_audit",
  "production_task_import_previews",
  "production_task_week_locks",
];
const serialize = (value) => BSON.EJSON.stringify(value, { relaxed: false });
const digest = (value) => createHash("sha256").update(serialize(value)).digest("hex");
const client = new MongoClient(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
});
try {
  await client.connect();
  const db = client.db(databaseName);
  const snapshot = {};
  for (const name of collections)
    snapshot[name] = await db.collection(name).find({}).sort({ _id: 1 }).toArray();
  const counts = Object.fromEntries(
    collections.map((name) => [name, snapshot[name].length]),
  );
  console.info(
    JSON.stringify({
      mode: values.apply ? "apply" : "dry-run",
      host,
      databaseName,
      counts,
    }),
  );
  if (values.apply && Object.values(counts).some(Boolean)) {
    const root = resolve(".local-backups");
    await mkdir(root, { recursive: true, mode: 0o700 });
    const directory = await mkdtemp(join(root, "tasks-"));
    const backup = join(directory, "snapshot.ejson");
    const payload = serialize({
      host,
      databaseName,
      createdAt: new Date(),
      collections: snapshot,
    });
    await writeFile(backup, payload, { flag: "wx", mode: 0o600 });
    if ((await readFile(backup, "utf8")) !== payload)
      throw new Error("Backup verification failed; nothing removed.");
    console.info(
      JSON.stringify({
        backup,
        sha256: createHash("sha256").update(payload).digest("hex"),
      }),
    );
    await client.withSession(async (session) => {
      await session.withTransaction(
        async () => {
          for (const name of collections) {
            const current = await db
              .collection(name)
              .find({}, { session })
              .sort({ _id: 1 })
              .toArray();
            if (digest(current) !== digest(snapshot[name]))
              throw new Error(
                `Collection changed since backup: ${name}. Nothing committed; rerun after writes stop.`,
              );
          }
          for (const name of collections) {
            const ids = snapshot[name].map((document) => document._id);
            if (!ids.length) continue;
            const result = await db
              .collection(name)
              .deleteMany({ _id: { $in: ids } }, { session });
            if (result.deletedCount !== ids.length)
              throw new Error(`Concurrent change in ${name}; aborting.`);
          }
        },
        { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } },
      );
    });
    const remaining = {};
    for (const name of collections)
      remaining[name] = await db.collection(name).countDocuments();
    console.info(
      JSON.stringify({
        deleted: counts,
        remaining,
        backup,
        areasPreserved: await db.collection("production_areas").countDocuments(),
      }),
    );
    if (Object.values(remaining).some(Boolean))
      throw new Error(
        "New task records appeared during cleanup; preserved them. Review before another reset.",
      );
  }
} finally {
  await client.close();
}
