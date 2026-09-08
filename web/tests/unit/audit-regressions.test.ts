import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const source = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("repository audit regression contracts", () => {
  it("keeps PTO runtime and bootstrap index names aligned", () => {
    const names = (text: string) =>
      [...text.matchAll(/name: "(pto_[^"]+)"/g)].map((match) => match[1]).sort();
    expect(names(source("src/features/pto/server/pto-indexes.ts"))).toEqual(
      names(source("scripts/bootstrap-pto-model.mjs")),
    );
  });

  it("does not run parallel queries on assignment and production transaction sessions", () => {
    const assignment = source("src/features/employees/server/assignment-repository.ts");
    const insert = assignment.slice(
      assignment.indexOf("async function insertAssignmentInTransaction"),
      assignment.indexOf(
        "export async function",
        assignment.indexOf("async function insertAssignmentInTransaction"),
      ),
    );
    expect(insert).toContain("session");
    expect(insert).not.toContain("Promise.all");
    const production = source(
      "src/features/production-tasks/server/production-task-repository.ts",
    );
    expect(production).not.toContain("Promise.all");
  });

  it("sets baseline browser security headers on all application routes", async () => {
    const rules = await nextConfig.headers!();
    const headers = rules.find((rule) => rule.source === "/:path*")?.headers;
    expect(headers).toEqual(
      expect.arrayContaining([
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Content-Security-Policy",
          value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
        },
      ]),
    );
  });
});
