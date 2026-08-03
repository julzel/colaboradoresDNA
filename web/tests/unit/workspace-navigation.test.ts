import { describe, expect, it } from "vitest";

import { getWorkspaceNavigation } from "@/features/navigation/workspace-navigation";

describe("workspace notification badge", () => {
  it("adds the unread count to Inicio for desktop and mobile navigation consumers", () => {
    const items = getWorkspaceNavigation("collaborator", 3);

    expect(items.find((item) => item.href === "/")?.badge).toBe("3");
  });

  it("caps a large unread count and hides a zero count", () => {
    expect(
      getWorkspaceNavigation("administrator", 100).find((item) => item.href === "/")
        ?.badge,
    ).toBe("99+");
    expect(
      getWorkspaceNavigation("administrator", 0).find((item) => item.href === "/")
        ?.badge,
    ).toBeUndefined();
  });
});
