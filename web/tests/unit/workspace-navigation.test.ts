import { describe, expect, it } from "vitest";

import {
  getDesktopWorkspaceNavigationSections,
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
    expect(getActiveNavigationHref("/admin/horarios", items)).toBe("/admin");
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

  it("expands administration destinations in the desktop shell", () => {
    const sections = getDesktopWorkspaceNavigationSections("administrator", 2);

    expect(sections.map((section) => section.label)).toEqual([
      "Espacio de trabajo",
      "Administración",
    ]);
    expect(sections[1]?.items.map((item) => item.href)).toEqual([
      "/admin/colaboradores",
      "/admin/horarios",
      "/admin/ausencias",
      "/admin/desarrollo",
      "/admin/accounts",
    ]);
    expect(sections[0]?.items[0]).toMatchObject({ badge: "2", href: "/" });
    expect(sections[0]?.items[1]).toMatchObject({
      href: "/calendario?vista=mes",
      label: "Calendario",
    });
    expect(getActiveNavigationHref("/calendario", sections[0]?.items ?? [])).toBe(
      "/calendario?vista=mes",
    );
  });

  it("places Horarios inside the administration hierarchy", () => {
    expect(getWorkspaceBreadcrumbs("/admin/horarios")).toEqual([
      { href: "/", label: "Inicio" },
      { href: "/admin", label: "Administración" },
      { label: "Horarios" },
    ]);
    expect(getWorkspaceBreadcrumbs("/admin/horarios/employee-1")).toEqual([
      { href: "/", label: "Inicio" },
      { href: "/admin", label: "Administración" },
      { href: "/admin/horarios", label: "Horarios" },
      { label: "Colaborador" },
    ]);
  });

  it("nests the read-only schedule under the collaborator profile", () => {
    expect(getWorkspaceBreadcrumbs("/perfil/horario")).toEqual([
      { href: "/", label: "Inicio" },
      { href: "/perfil", label: "Mi perfil" },
      { label: "Mi horario" },
    ]);
  });
});
