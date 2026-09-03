import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const source = readFileSync(
  resolve(webRoot, "src/features/pto/server/pto-repository.ts"),
  "utf8",
);

describe("PTO schedule-duration persistence contract", () => {
  it("compares the draft revision before freezing a calculated duration", () => {
    const start = source.indexOf("export async function submitPtoDraft");
    const end = source.indexOf("export async function cancelPtoRequest", start);
    const submitSource = source.slice(start, end);

    expect(submitSource).toContain("expectedUpdatedAt: Date");
    expect(submitSource.match(/updatedAt: input\.expectedUpdatedAt/g)).toHaveLength(2);
    expect(submitSource).toContain("durationCalculation: duration.calculation");
    expect(submitSource).toContain("durationUnits: duration.units");
  });
});
