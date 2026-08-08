import { describe, expect, it } from "vitest";

import {
  getActiveNavigationHref,
  getWorkspaceBreadcrumbs,
  getWorkspaceNavigation,
} from "@/features/navigation/workspace-navigation";

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

describe("administrator navigation", () => {
  it("uses the administration hub instead of exposing its modules directly", () => {
    const items = getWorkspaceNavigation("administrator");

    expect(items.map((item) => item.href)).toEqual([
      "/",
      "/calendario",
      "/admin",
      "/ausencias",
    ]);
    expect(getActiveNavigationHref("/admin/colaboradores", items)).toBe("/admin");
    expect(getActiveNavigationHref("/admin/ausencias", items)).toBe("/admin");
    expect(getActiveNavigationHref("/admin/desarrollo", items)).toBe("/admin");
  });

  it("keeps Desarrollo inside the administration hierarchy", () => {
    expect(getWorkspaceBreadcrumbs("/admin/desarrollo")).toEqual([
      { href: "/", label: "Inicio" },
      { href: "/admin", label: "Administración" },
      { label: "Desarrollo" },
    ]);
  });
});
