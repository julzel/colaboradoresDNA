import { CalendarDays, House, Settings } from "lucide-react";

import type { NavigationItem } from "@/components/ui/navigation/side-navigation";
import type { PlatformRole } from "@/features/auth/domain/platform-user";

const baseNavigationItems: readonly NavigationItem[] = [
  { href: "/", icon: House, label: "Inicio" },
  { href: "/calendario", icon: CalendarDays, label: "Calendario" },
];

const administratorNavigationItem: NavigationItem = {
  href: "/admin",
  icon: Settings,
  label: "Administración",
};

export function getWorkspaceNavigation(role: PlatformRole): readonly NavigationItem[] {
  return role === "administrator"
    ? [...baseNavigationItems, administratorNavigationItem]
    : baseNavigationItems;
}
