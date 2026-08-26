import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const appRoutes = resolve(webRoot, "src/app");

function getPageAndLayoutFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return getPageAndLayoutFiles(path);
    }

    return entry.isFile() && /^(?:layout|page)\.tsx$/.test(entry.name) ? [path] : [];
  });
}

describe("page data boundaries", () => {
  it("keeps repositories and backend provider clients behind feature services", () => {
    const violations = getPageAndLayoutFiles(appRoutes)
      .flatMap((path) => {
        const source = readFileSync(path, "utf8");
        const reasons = [
          /from ["']@\/features\/.*\/server\/.*repository["']/.test(source)
            ? "repository import"
            : null,
          /from ["']@clerk\/nextjs\/server["']/.test(source)
            ? "Clerk backend import"
            : null,
          /from ["']mongodb["']/.test(source) ? "MongoDB import" : null,
        ].filter(Boolean);

        return reasons.map(
          (reason) => `${relative(webRoot, path)}: ${reason as string}`,
        );
      })
      .sort();

    expect(violations).toEqual([]);
  });
});
