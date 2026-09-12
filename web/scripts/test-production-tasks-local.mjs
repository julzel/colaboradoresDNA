import { spawn } from "node:child_process";
import { MongoMemoryReplSet } from "mongodb-memory-server";

// Never load .env.local or connect to a shared database. Transactions require a replica set.
const replica = await MongoMemoryReplSet.create({
  binary: { version: "8.0.12" },
  replSet: { count: 1, storageEngine: "wiredTiger" },
});
try {
  const environment = {
    ...process.env,
    MONGODB_URI: replica.getUri(),
    MONGODB_DB: "local_tasks_test",
    RUN_TASK_EDIT_LIVE: "1",
    RUN_TASKS_LIVE: "1",
  };
  for (const args of [["--dry-run"], [], []]) {
    const bootstrap = spawn(
      process.execPath,
      ["scripts/bootstrap-production-tasks-model.mjs", ...args],
      { stdio: "inherit", env: environment },
    );
    const code = await new Promise((resolve, reject) => {
      bootstrap.once("error", reject);
      bootstrap.once("exit", resolve);
    });
    if (code !== 0) throw new Error("Local model bootstrap failed");
  }
  const child = spawn(
    process.execPath,
    [
      "node_modules/vitest/vitest.mjs",
      "run",
      "tests/integration/production-task-edit-mongodb.test.ts",
      "tests/integration/production-tasks-mongodb.test.ts",
      "tests/integration/production-task-reset-mongodb.test.ts",
    ],
    {
      stdio: "inherit",
      env: environment,
    },
  );
  process.exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
} finally {
  await replica.stop();
}
