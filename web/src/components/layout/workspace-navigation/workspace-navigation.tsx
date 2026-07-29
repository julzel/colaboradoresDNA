"use client";

import { usePathname } from "next/navigation";

import { SideNavigation } from "@/components/ui/navigation/side-navigation";
import type { PlatformRole } from "@/features/auth/domain/platform-user";
import {
  getActiveNavigationHref,
  getWorkspaceNavigation,
} from "@/features/navigation/workspace-navigation";

type WorkspaceNavigationProps = {
  label?: string;
  role: PlatformRole;
};

export function WorkspaceNavigation({
  label = "Navegación principal",
  role,
}: WorkspaceNavigationProps) {
  const pathname = usePathname();
  const items = getWorkspaceNavigation(role);

  return (
    <SideNavigation
      currentHref={getActiveNavigationHref(pathname, items)}
      items={items}
      label={label}
    />
  );
}
