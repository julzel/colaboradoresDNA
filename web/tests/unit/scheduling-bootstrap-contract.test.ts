import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const bootstrapSource = readFileSync(
  resolve(webRoot, "scripts/bootstrap-scheduling-model.mjs"),
  "utf8",
);
const packageJson = JSON.parse(
  readFileSync(resolve(webRoot, "package.json"), "utf8"),
) as { scripts: Record<string, string> };
const employeeBootstrapSource = readFileSync(
  resolve(webRoot, "scripts/bootstrap-employee-model.mjs"),
  "utf8",
);
const employeeIndexesSource = readFileSync(
  resolve(webRoot, "src/features/employees/server/employee-indexes.ts"),
  "utf8",
);

describe("scheduling model bootstrap contract", () => {
  it("exposes an explicit migration-principal command", () => {
    expect(packageJson.scripts["bootstrap:scheduling-model"]).toBe(
      "node --env-file=.env.local scripts/bootstrap-scheduling-model.mjs",
    );
  });

  it("reconciles both employee schedule timeline indexes", () => {
    expect(bootstrapSource).toContain("employee_schedules_employee_timeline");
    expect(bootstrapSource).toContain("employee_schedules_one_open_period");
    expect(bootstrapSource).toContain("partialFilterExpression: { effectiveTo: null }");
    expect(bootstrapSource).toContain("async function reconcileIndex");
    expect(bootstrapSource).toContain("isDeepStrictEqual");
    expect(bootstrapSource).toContain("await assertSafeScheduleState(schedules)");
    expect(
      bootstrapSource.indexOf("await assertSafeScheduleState(schedules)"),
    ).toBeLessThan(bootstrapSource.indexOf("for (const index of scheduleIndexes)"));
    expect(employeeBootstrapSource).not.toContain("employee_schedules");
    expect(employeeIndexesSource).not.toContain("employee_schedules");
  });

  it("installs moderate dual-read validation for v2 and legacy schedules", () => {
    expect(bootstrapSource).toContain('validationLevel: "moderate"');
    expect(bootstrapSource).toContain("$jsonSchema: v2DocumentSchema");
    expect(bootstrapSource).toContain("$jsonSchema: legacyDocumentSchema");
    expect(bootstrapSource).toContain("version: { enum: [2] }");
    expect(bootstrapSource).toContain("version: { enum: [1] }");
    expect(bootstrapSource).toContain("$isoDayOfWeek");
    expect(bootstrapSource).toContain("minItems: 1");
    expect(bootstrapSource).toContain("maxItems: 2");
    expect(bootstrapSource).toContain('startTime: { bsonType: "string"');
    expect(bootstrapSource).toContain('endTime: { bsonType: "string"');
    expect(bootstrapSource).toContain("canonicalSchedulePreflightSchema");
    expect(bootstrapSource).toContain("Duplicate open schedule periods");
    expect(bootstrapSource).toContain("Overlapping schedule periods");
  });

  it("does not rewrite legacy records or invent legacy clock times", () => {
    expect(bootstrapSource).not.toMatch(/\.(?:bulkWrite|updateMany|updateOne)\(/);
    expect(bootstrapSource).not.toContain('startTime: "08:00"');
    expect(bootstrapSource).not.toContain('endTime: "17:00"');
  });
});
