"use client";

import { usePathname } from "next/navigation";

import { AuthControls } from "@/components/auth/auth-controls";
import { WorkspaceNavigation } from "@/components/layout/workspace-navigation/workspace-navigation";
import { Breadcrumbs } from "@/components/ui/navigation/breadcrumbs";
import { ThemeToggle } from "@/components/ui/theme-toggle/theme-toggle";
import type { PlatformRole } from "@/features/auth/domain/platform-user";
import { getWorkspaceBreadcrumbs } from "@/features/navigation/workspace-navigation";

import styles from "./workspace-header.module.css";

type WorkspaceHeaderProps = {
  role: PlatformRole;
};

export function WorkspaceHeader({ role }: WorkspaceHeaderProps) {
  const pathname = usePathname();

  return (
    <header className={styles.topbar}>
      <details className={styles.mobileNav}>
        <summary>Abrir navegación</summary>
        <WorkspaceNavigation label="Navegación móvil" role={role} />
      </details>
      <Breadcrumbs items={getWorkspaceBreadcrumbs(pathname)} />
      <div className={styles.tools}>
        <ThemeToggle />
        <AuthControls />
      </div>
    </header>
  );
}
