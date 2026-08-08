import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const repositorySource = readFileSync(
  resolve(webRoot, "src/features/development/server/development-repository.ts"),
  "utf8",
);

function functionSource(name: string, nextName?: string) {
  const start = repositorySource.indexOf(`export async function ${name}`);
  const end = nextName
    ? repositorySource.indexOf(`export async function ${nextName}`, start)
    : repositorySource.length;
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return repositorySource.slice(start, end);
}

describe("development 1:1 repository contracts", () => {
  it("commits the record, optional calendar event, and content-free audits together", () => {
    const source = functionSource("createOneOnOneRecord", "updateOneOnOneDraft");

    expect(source).toContain("session.withTransaction");
    expect(source).toContain("createCalendarEvent(session)");
    expect(source).toContain("collection.insertOne(document, { session })");
    expect(source).toContain("recordDevelopmentAudit({");
    expect(source).toContain("session,");
    expect(source).not.toContain("sharedSummary");
    expect(source).not.toContain("discussionSections");
  });

  it("uses employee-scoped compare-and-set writes for drafts and action status", () => {
    const draftSource = functionSource(
      "updateOneOnOneDraft",
      "setOneOnOneActionStatus",
    );
    const actionSource = functionSource(
      "setOneOnOneActionStatus",
      "recordOneOnOneViewed",
    );

    expect(draftSource).toContain("employeeId: parsedEmployeeId");
    expect(draftSource).toContain('status: "draft"');
    expect(draftSource).toContain("version: expectedVersion");
    expect(draftSource).toContain("$inc: { version: 1 }");
    expect(actionSource).toContain("employeeId: new ObjectId(employeeId)");
    expect(actionSource).toContain('status: "finalized"');
    expect(actionSource).toContain("version: expectedVersion");
    expect(actionSource).toContain("arrayFilters");
  });

  it("records decrypted narrative reads without copying narrative content", () => {
    const source = functionSource("recordOneOnOneViewed");

    expect(source).toContain('action: "record_viewed"');
    expect(source).toContain("changedFields: []");
    expect(source).toContain("session.withTransaction");
    expect(source).not.toContain("narrative");
  });
});
