import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const featuresRoot = resolve(webRoot, "src/features");

function getServerActionFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) return getServerActionFiles(path);
    if (!entry.isFile() || !/\.tsx?$/.test(entry.name)) return [];

    return readFileSync(path, "utf8").startsWith('"use server"') ? [path] : [];
  });
}

describe("Server Action boundaries", () => {
  it("keeps authorization, persistence, and provider clients behind use cases", () => {
    const violations = getServerActionFiles(featuresRoot)
      .flatMap((path) => {
        const source = readFileSync(path, "utf8");
        const reasons = [
          /from ["']@\/features\/.*\/server\/.*repository["']/.test(source)
            ? "repository import"
            : null,
          /from ["']@\/features\/auth\/server\/require-platform-user["']/.test(source)
            ? "authorization-boundary import"
            : null,
          /from ["']@clerk\/nextjs\/server["']/.test(source)
            ? "Clerk backend import"
            : null,
          /from ["']mongodb["']/.test(source) ? "MongoDB import" : null,
        ].filter((reason): reason is string => reason !== null);

        return reasons.map((reason) => `${relative(webRoot, path)}: ${reason}`);
      })
      .sort();

    expect(violations).toEqual([]);
  });
});
