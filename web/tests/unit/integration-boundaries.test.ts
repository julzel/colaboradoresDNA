import { readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath: string) {
  return readFileSync(resolve(webRoot, relativePath), "utf8");
}

describe("cross-feature integration boundaries", () => {
  it("keeps Calendar orchestration independent from PTO and Development internals", () => {
    const source = read("src/features/calendar/server/calendar-service.ts");

    expect(source).not.toMatch(
      /from ["']@\/features\/(?:pto|development)\/(?:domain|server)\//,
    );
  });

  it("keeps Development orchestration independent from Calendar internals", () => {
    const source = read("src/features/development/server/development-service.ts");

    expect(source).not.toMatch(/from ["']@\/features\/calendar\/(?:domain|server)\//);
  });

  it("keeps PTO orchestration independent from Scheduling internals", () => {
    const source = read("src/features/pto/server/pto-service.ts");

    expect(source).not.toMatch(/from ["']@\/features\/scheduling\/(?:domain|server)\//);
  });

  it("keeps Scheduling orchestration independent from PTO internals", () => {
    const source = read("src/features/scheduling/server/scheduler-service.ts");

    expect(source).not.toMatch(/from ["']@\/features\/pto\/(?:domain|server)\//);
  });

  it("keeps employee lifecycle orchestration independent from Scheduling internals", () => {
    const source = read("src/features/employees/server/employee-repository.ts");

    expect(source).not.toMatch(/from ["']@\/features\/scheduling\/(?:domain|server)\//);
  });

  it("keeps consumer-owned ports free of provider implementation imports", () => {
    const ports = [
      "src/features/calendar/integrations/calendar-development-port.ts",
      "src/features/calendar/integrations/calendar-holiday-port.ts",
      "src/features/calendar/integrations/calendar-pto-port.ts",
      "src/features/development/integrations/development-calendar-port.ts",
      "src/features/employees/integrations/employee-scheduling-port.ts",
      "src/features/pto/integrations/pto-scheduling-port.ts",
      "src/features/scheduling/integrations/scheduling-employee-port.ts",
    ];
    const violations = ports
      .filter((path) => /from ["']@\/features\/.*\/server\//.test(read(path)))
      .map((path) => relative(webRoot, resolve(webRoot, path)));

    expect(violations).toEqual([]);
  });

  it("keeps the PTO adapter provider-owned by Scheduling", () => {
    const source = read(
      "src/features/scheduling/integrations/pto-scheduling-adapter.ts",
    );

    expect(source).toMatch(
      /from ["']@\/features\/pto\/integrations\/pto-scheduling-port["']/,
    );
    expect(source).not.toMatch(/from ["']@\/features\/pto\/(?:domain|server)\//);
  });

  it("keeps the employee lifecycle adapter provider-owned by Scheduling", () => {
    const source = read(
      "src/features/scheduling/integrations/employee-scheduling-adapter.ts",
    );

    expect(source).toMatch(
      /from ["']@\/features\/employees\/integrations\/employee-scheduling-port["']/,
    );
    expect(source).not.toMatch(/from ["']@\/features\/employees\/(?:domain|server)\//);
  });
});
