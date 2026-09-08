import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { planningOpenApi } from "@/features/planning/http/openapi";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? sourceFiles(join(directory, entry.name))
      : /\.(ts|tsx)$/.test(entry.name)
        ? [join(directory, entry.name)]
        : [],
  );
}

describe("planning architecture and API contract", () => {
  it("keeps the application independent of Next, React, OpenAI and MongoDB", () => {
    for (const file of sourceFiles("src/features/planning/application")) {
      expect(readFileSync(file, "utf8")).not.toMatch(
        /from ["'](?:next|react|openai|mongodb|.*\/server\/|.*\/components\/)/,
      );
    }
    for (const file of sourceFiles("src/features/planning/components")) {
      expect(readFileSync(file, "utf8")).not.toMatch(
        /from ["'](?:openai|mongodb|.*\/server\/|.*\/application\/)/,
      );
    }
  });
  it("publishes an OpenAPI 3.1 contract from shared input and output schemas", () => {
    expect(planningOpenApi.openapi).toBe("3.1.0");
    expect(Object.keys(planningOpenApi.paths)).toEqual([
      "/workspace",
      "/context",
      "/proposals",
      "/plan",
      "/tasks/{taskId}",
    ]);
    expect(planningOpenApi.components.schemas.GenerateRequest).toMatchObject({
      type: "object",
      additionalProperties: false,
    });
    expect(planningOpenApi.components.schemas.Bootstrap).toBeDefined();
  });
});
