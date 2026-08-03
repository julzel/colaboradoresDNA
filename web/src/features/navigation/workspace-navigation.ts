import { CalendarDays, ClipboardClock, House, Settings, Users } from "lucide-react";

import type { NavigationItem } from "@/components/ui/navigation/side-navigation";
import type { PlatformRole } from "@/features/auth/domain/platform-user";

const baseNavigationItems: readonly NavigationItem[] = [
  { href: "/", icon: House, label: "Inicio" },
  { href: "/calendario", icon: CalendarDays, label: "Calendario" },
  { href: "/ausencias", icon: ClipboardClock, label: "Ausencias" },
];

const administratorNavigationItem: NavigationItem = {
  href: "/admin",
  icon: Settings,
  label: "Administración",
};

const employeeNavigationItem: NavigationItem = {
  href: "/admin/colaboradores",
  icon: Users,
  label: "Colaboradores",
};

const ptoAdministrationNavigationItem: NavigationItem = {
  href: "/admin/ausencias",
  icon: ClipboardClock,
  label: "Gestionar ausencias",
};

export function getWorkspaceNavigation(
  role: PlatformRole,
  unreadNotificationCount = 0,
): readonly NavigationItem[] {
  const navigationItems = baseNavigationItems.map((item) =>
    item.href === "/" && unreadNotificationCount > 0
      ? {
          ...item,
          badge: unreadNotificationCount > 99 ? "99+" : String(unreadNotificationCount),
        }
      : item,
  );
  return role === "administrator"
    ? [
        ...navigationItems,
        administratorNavigationItem,
        employeeNavigationItem,
        ptoAdministrationNavigationItem,
      ]
    : navigationItems;
}

export function getActiveNavigationHref(
  pathname: string,
  items: readonly NavigationItem[],
) {
  const activeItem = items
    .filter(
      (item) =>
        item.href === pathname ||
        (item.href !== "/" && pathname.startsWith(`${item.href}/`)),
    )
    .sort((first, second) => second.href.length - first.href.length)[0];

  return activeItem?.href ?? "/";
}

export function getWorkspaceBreadcrumbs(pathname: string) {
  if (pathname.startsWith("/ausencias")) {
    return [
      { href: "/", label: "Inicio" },
      { label: "Solicitudes de ausencia" },
    ] as const;
  }

  if (pathname.startsWith("/perfil")) {
    return [{ href: "/", label: "Inicio" }, { label: "Mi perfil" }] as const;
  }

  if (pathname.startsWith("/calendario")) {
    return [{ href: "/", label: "Inicio" }, { label: "Calendario" }] as const;
  }

  if (pathname.startsWith("/admin/accounts")) {
    return [
      { href: "/", label: "Inicio" },
      { href: "/admin", label: "Administración" },
      { label: "Cuentas y acceso" },
    ] as const;
  }

  if (pathname.startsWith("/admin/ausencias")) {
    return [
      { href: "/", label: "Inicio" },
      { href: "/admin", label: "Administración" },
      { label: "Solicitudes de ausencia" },
    ] as const;
  }

  if (pathname.startsWith("/admin/colaboradores")) {
    return [
      { href: "/", label: "Inicio" },
      { href: "/admin", label: "Administración" },
      { label: "Colaboradores" },
    ] as const;
  }

  if (pathname.startsWith("/admin")) {
    return [{ href: "/", label: "Inicio" }, { label: "Administración" }] as const;
  }

  return [{ label: "Inicio" }] as const;
}
