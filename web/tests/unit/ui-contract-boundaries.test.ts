import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sourceRoot = resolve(webRoot, "src");

function getUiFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) return getUiFiles(path);
    if (!entry.isFile() || !/\.tsx?$/.test(entry.name)) return [];

    const relativePath = relative(sourceRoot, path);
    return relativePath.includes("components/") ? [path] : [];
  });
}

function getViewModelFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) return getViewModelFiles(path);
    if (!entry.isFile() || !/\.tsx?$/.test(entry.name)) return [];

    const relativePath = relative(sourceRoot, path);
    return relativePath.includes("view-models/") ? [path] : [];
  });
}

function getAllTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return getAllTypeScriptFiles(path);
    return entry.isFile() && /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe("UI contract boundaries", () => {
  it("keeps component contracts independent from repositories", () => {
    const violations = getUiFiles(sourceRoot)
      .filter((path) =>
        /from ["']@\/features\/.*\/server\/.*repository["']/.test(
          readFileSync(path, "utf8"),
        ),
      )
      .map((path) => relative(webRoot, path))
      .sort();

    expect(violations).toEqual([]);
  });

  it("keeps view models independent from server and persistence modules", () => {
    const violations = getViewModelFiles(sourceRoot)
      .filter((path) => {
        const source = readFileSync(path, "utf8");
        return (
          /from ["']@\/features\/.*\/server\//.test(source) ||
          /from ["'](?:mongodb|server-only)["']/.test(source)
        );
      })
      .map((path) => relative(webRoot, path))
      .sort();

    expect(violations).toEqual([]);
  });

  it("keeps the Tasks application core independent from its presentation", () => {
    const taskRoot = resolve(sourceRoot, "features/production-tasks");
    const coreFiles = ["application", "domain", "integrations", "server"].flatMap(
      (directory) => getAllTypeScriptFiles(resolve(taskRoot, directory)),
    );
    const violations = coreFiles
      .filter((path) =>
        /from ["']@\/features\/production-tasks\/(?:actions|components|presentation|view-models)\//.test(
          readFileSync(path, "utf8"),
        ),
      )
      .map((path) => relative(webRoot, path))
      .sort();

    expect(violations).toEqual([]);
  });

  it("keeps the Tasks application layer free of Next.js and infrastructure imports", () => {
    const applicationRoot = resolve(
      sourceRoot,
      "features/production-tasks/application",
    );
    const violations = getAllTypeScriptFiles(applicationRoot)
      .filter((path) => {
        const source = readFileSync(path, "utf8");
        return (
          /from ["']next\//.test(source) ||
          /from ["']mongodb["']/.test(source) ||
          /from ["']@\/features\/production-tasks\/server\//.test(source)
        );
      })
      .map((path) => relative(webRoot, path))
      .sort();

    expect(violations).toEqual([]);
  });
});
