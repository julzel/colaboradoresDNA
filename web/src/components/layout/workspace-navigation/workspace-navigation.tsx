"use client";

import { usePathname } from "next/navigation";

import { SideNavigation } from "@/components/ui/navigation/side-navigation";
import type { PlatformRole } from "@/features/auth/domain/platform-user";
import {
  getActiveNavigationHref,
  getDesktopWorkspaceNavigationSections,
} from "@/features/navigation/workspace-navigation";

import styles from "./workspace-navigation.module.css";

type WorkspaceNavigationProps = {
  expanded?: boolean;
  label?: string;
  role: PlatformRole;
};

export function WorkspaceNavigation({
  expanded = false,
  label = "Navegación principal",
  role,
}: WorkspaceNavigationProps) {
  const pathname = usePathname();
  const sections = getDesktopWorkspaceNavigationSections(role);
  const items = sections.flatMap((section) => section.items);
  const currentHref = getActiveNavigationHref(pathname, items);

  return (
    <div aria-label={label} className={styles.navigation} role="group">
      {sections.map((section) => (
        <div key={section.label}>
          <SideNavigation
            currentHref={currentHref}
            expanded={expanded}
            items={section.items}
            label={section.label}
          />
        </div>
      ))}
    </div>
  );
}
