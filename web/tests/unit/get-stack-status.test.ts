import { describe, expect, it } from "vitest";

import { getStackStatus } from "@/features/system/lib/get-stack-status";

describe("getStackStatus", () => {
  it("reports a configured development environment", () => {
    expect(getStackStatus("development", "mongodb+srv://example")).toEqual({
      databaseConfigured: true,
      environment: "development",
    });
  });

  it("normalizes unknown environments and empty database values", () => {
    expect(getStackStatus("preview", " ")).toEqual({
      databaseConfigured: false,
      environment: "development",
    });
  });
});
