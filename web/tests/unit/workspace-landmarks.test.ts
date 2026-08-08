import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const workspaceRoutes = resolve(webRoot, "src/app/(workspace)");
const workspaceShell = resolve(
  webRoot,
  "src/components/layout/workspace-shell/workspace-shell.tsx",
);

function getTypeScriptReactFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return getTypeScriptReactFiles(path);
    }

    return entry.isFile() && entry.name.endsWith(".tsx") ? [path] : [];
  });
}

describe("workspace landmarks", () => {
  it("owns the main content landmark in WorkspaceShell only", () => {
    const shellSource = readFileSync(workspaceShell, "utf8");
    const routeViolations = getTypeScriptReactFiles(workspaceRoutes)
      .filter((path) => {
        const source = readFileSync(path, "utf8");

        return /<main\b/.test(source) || /id=["']main-content["']/.test(source);
      })
      .map((path) => relative(webRoot, path));

    expect(shellSource.match(/<main\b/g)).toHaveLength(1);
    expect(shellSource.match(/id=["']main-content["']/g)).toHaveLength(1);
    expect(routeViolations).toEqual([]);
  });
});
