import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

describe("production task bootstrap contract", () => {
  it("keeps index administration out of runtime repositories", () => {
    const source = readFileSync(
      resolve(
        webRoot,
        "src/features/production-tasks/server/production-task-indexes.ts",
      ),
      "utf8",
    );
    expect(source).not.toMatch(/createIndex|bulkWrite/);
  });

  it("owns all production collections and a non-mutating dry run in the bootstrap", () => {
    const source = readFileSync(
      resolve(webRoot, "scripts/bootstrap-production-tasks-model.mjs"),
      "utf8",
    );
    expect(source).toContain('process.argv.includes("--dry-run")');
    expect(source).toContain("production_week_plans_current_slot_unique");
    expect(source).toContain("production_task_import_previews_expiry");
    expect(source).toContain("production_task_assignment_changes_unique");
    expect(source).toMatch(/if \(dryRun\) return;/);
  });
});
