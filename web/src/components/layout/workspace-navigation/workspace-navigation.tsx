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
  unreadNotificationCount?: number;
};

export function WorkspaceNavigation({
  expanded = false,
  label = "Navegación principal",
  role,
  unreadNotificationCount = 0,
}: WorkspaceNavigationProps) {
  const pathname = usePathname();
  const sections = getDesktopWorkspaceNavigationSections(role, unreadNotificationCount);
  const items = sections.flatMap((section) => section.items);
  const currentHref = getActiveNavigationHref(pathname, items);

  return (
    <div
      aria-label={label}
      className={`${styles.navigation} ${expanded ? styles.expanded : ""}`}
      role="group"
    >
      {sections.map((section) => (
        <section className={styles.section} key={section.label}>
          <p className={styles.label}>{section.label}</p>
          <SideNavigation
            currentHref={currentHref}
            expanded={expanded}
            items={section.items}
            label={section.label}
          />
        </section>
      ))}
    </div>
  );
}
