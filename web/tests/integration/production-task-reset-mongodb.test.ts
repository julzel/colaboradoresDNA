// @vitest-environment node
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { MongoClient, BSON } from "mongodb";
import { describe, it, expect } from "vitest";

describe.skipIf(process.env.RUN_TASK_EDIT_LIVE !== "1")(
  "task reset safety on local MongoDB",
  () => {
    it("backs up all revisions, preserves catalogs, rejects wrong targets, and removes only task data", async () => {
      const uri = process.env.MONGODB_URI!;
      const host = new URL(uri).hostname;
      if (host !== "127.0.0.1" && host !== "localhost")
        throw new Error("Local replica set required");
      const client = await MongoClient.connect(uri);
      const databaseName = "reset_safety_test";
      const db = client.db(databaseName);
      const cwd = await mkdtemp(join(tmpdir(), "dna-reset-check-"));
      const script = resolve("scripts/reset-production-tasks.mjs");
      const run = (...args: string[]) =>
        execFileSync(
          process.execPath,
          [
            script,
            "--expected-host",
            host,
            "--expected-database",
            databaseName,
            ...args,
          ],
          {
            cwd,
            env: { ...process.env, MONGODB_DB: databaseName },
            encoding: "utf8",
            stdio: "pipe",
          },
        );
      try {
        await db.collection("production_week_plans").insertMany([
          { revision: 1, status: "superseded" },
          { revision: 2, status: "published" },
        ]);
        await db
          .collection("production_task_audit")
          .insertOne({ action: "plan_created" });
        await db.collection("production_areas").insertOne({ name: "Cocinado" });
        await db.collection("employees").insertOne({ name: "Synthetic employee" });
        expect(() => run("--expected-database", "wrong")).toThrow();
        run();
        expect(await db.collection("production_week_plans").countDocuments()).toBe(2);
        run("--apply");
        expect(await db.collection("production_week_plans").countDocuments()).toBe(0);
        expect(await db.collection("production_task_audit").countDocuments()).toBe(0);
        expect(await db.collection("production_areas").countDocuments()).toBe(1);
        expect(await db.collection("employees").countDocuments()).toBe(1);
        const directories = await readdir(join(cwd, ".local-backups"));
        const snapshot = BSON.EJSON.parse(
          await readFile(
            join(cwd, ".local-backups", directories[0]!, "snapshot.ejson"),
            "utf8",
          ),
        );
        expect(snapshot.collections.production_week_plans).toHaveLength(2);
        expect(snapshot.collections.production_task_audit).toHaveLength(1);
      } finally {
        await client.close();
      }
    }, 30000);
  },
);
