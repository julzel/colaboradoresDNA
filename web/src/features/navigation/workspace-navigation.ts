import {
  CalendarDays,
  CalendarClock,
  ChartNoAxesColumnIncreasing,
  ClipboardCheck,
  ClipboardClock,
  House,
  Settings,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

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

const administratorWorkspaceItems: readonly NavigationItem[] = [
  {
    href: "/admin/horarios",
    icon: CalendarClock,
    label: "Horarios",
  },
  {
    href: "/admin/ausencias",
    icon: ClipboardCheck,
    label: "Aprobar ausencias",
  },
  {
    href: "/admin/colaboradores",
    icon: UsersRound,
    label: "Colaboradores",
  },
  {
    href: "/admin/desarrollo",
    icon: ChartNoAxesColumnIncreasing,
    label: "Desarrollo",
  },
  { href: "/admin/accounts", icon: ShieldCheck, label: "Cuentas y acceso" },
];

export type WorkspaceNavigationSection = {
  items: readonly NavigationItem[];
  label: string;
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
  if (role !== "administrator") {
    return navigationItems;
  }

  return [
    navigationItems[0]!,
    administratorNavigationItem,
    ...navigationItems.slice(1),
  ];
}

export function getDesktopWorkspaceNavigationSections(
  role: PlatformRole,
  unreadNotificationCount = 0,
): readonly WorkspaceNavigationSection[] {
  const workspaceItems = baseNavigationItems.map((item) => {
    if (item.href === "/") {
      return unreadNotificationCount > 0
        ? {
            ...item,
            badge:
              unreadNotificationCount > 99 ? "99+" : String(unreadNotificationCount),
          }
        : item;
    }

    return item.href === "/calendario"
      ? { ...item, href: "/calendario?vista=mes" }
      : item;
  });

  return role === "administrator"
    ? [
        { items: workspaceItems, label: "Espacio de trabajo" },
        { items: administratorWorkspaceItems, label: "Administración" },
      ]
    : [{ items: workspaceItems, label: "Espacio de trabajo" }];
}

export function getActiveNavigationHref(
  pathname: string,
  items: readonly NavigationItem[],
) {
  const activeItem = items
    .filter((item) => {
      const itemPathname = item.href.split("?")[0] ?? item.href;

      return (
        itemPathname === pathname ||
        (itemPathname !== "/" && pathname.startsWith(`${itemPathname}/`))
      );
    })
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

  if (pathname.startsWith("/perfil/horario")) {
    return [
      { href: "/", label: "Inicio" },
      { href: "/perfil", label: "Mi perfil" },
      { label: "Mi horario" },
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

  if (/^\/admin\/horarios\/[^/]+/.test(pathname)) {
    return [
      { href: "/", label: "Inicio" },
      { href: "/admin", label: "Administración" },
      { href: "/admin/horarios", label: "Horarios" },
      { label: "Colaborador" },
    ] as const;
  }

  if (pathname.startsWith("/admin/horarios")) {
    return [
      { href: "/", label: "Inicio" },
      { href: "/admin", label: "Administración" },
      { label: "Horarios" },
    ] as const;
  }

  if (pathname.startsWith("/admin/desarrollo")) {
    return [
      { href: "/", label: "Inicio" },
      { href: "/admin", label: "Administración" },
      { label: "Desarrollo" },
    ] as const;
  }

  if (pathname === "/admin/colaboradores/nuevo") {
    return [
      { href: "/", label: "Inicio" },
      { href: "/admin", label: "Administración" },
      { href: "/admin/colaboradores", label: "Colaboradores" },
      { label: "Nuevo colaborador" },
    ] as const;
  }

  if (/^\/admin\/colaboradores\/[^/]+\/?$/.test(pathname)) {
    return [
      { href: "/", label: "Inicio" },
      { href: "/admin", label: "Administración" },
      { href: "/admin/colaboradores", label: "Colaboradores" },
      { label: "Detalle" },
    ] as const;
  }

  if (/^\/admin\/colaboradores\/[^/]+\/desarrollo/.test(pathname)) {
    return [
      { href: "/", label: "Inicio" },
      { href: "/admin", label: "Administración" },
      { href: "/admin/desarrollo", label: "Desarrollo" },
      { label: "Colaborador" },
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
