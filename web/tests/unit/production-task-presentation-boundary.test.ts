import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sourceRoot = resolve(webRoot, "src");

function typeScriptFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return typeScriptFiles(path);
    return entry.isFile() && /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe("production task presentation boundary", () => {
  it("uses the public Tasks application entry instead of internal services", () => {
    const presentationFiles = [
      ...typeScriptFiles(resolve(sourceRoot, "app")),
      ...typeScriptFiles(resolve(sourceRoot, "features/production-tasks/actions")),
      ...typeScriptFiles(resolve(sourceRoot, "features/production-tasks/components")),
      ...typeScriptFiles(resolve(sourceRoot, "features/production-tasks/presentation")),
      ...typeScriptFiles(resolve(sourceRoot, "features/production-tasks/view-models")),
    ];
    const violations = presentationFiles
      .filter((path) => {
        const imports = [
          ...readFileSync(path, "utf8").matchAll(
            /from ["']@\/features\/production-tasks\/server\/([^"']+)["']/g,
          ),
        ];
        return imports.some((match) => match[1] !== "production-task-application");
      })
      .map((path) => relative(webRoot, path))
      .sort();

    expect(violations).toEqual([]);
  });
});
