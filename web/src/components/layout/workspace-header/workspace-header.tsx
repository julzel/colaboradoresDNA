"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AuthControls } from "@/components/auth/auth-controls";
import { Logo } from "@/components/brand/logo/logo";
import { WorkspaceNavigation } from "@/components/layout/workspace-navigation/workspace-navigation";
import { Breadcrumbs } from "@/components/ui/navigation/breadcrumbs";
import { ThemeToggle } from "@/components/ui/theme-toggle/theme-toggle";
import type { PlatformRole } from "@/features/auth/domain/platform-user";
import { getWorkspaceBreadcrumbs } from "@/features/navigation/workspace-navigation";

import styles from "./workspace-header.module.css";

type WorkspaceHeaderProps = {
  displayName: string;
  role: PlatformRole;
  unreadNotificationCount: number;
};

export function WorkspaceHeader({
  displayName,
  role,
  unreadNotificationCount,
}: WorkspaceHeaderProps) {
  const pathname = usePathname();

  return (
    <header className={styles.topbar}>
      <div className={styles.mobileLeading}>
        <details className={styles.mobileNav} key={pathname}>
          <summary aria-label="Abrir navegación">
            <Menu aria-hidden="true" className={styles.menuIcon} size={21} />
            <X aria-hidden="true" className={styles.closeIcon} size={21} />
          </summary>
          <div className={styles.mobileNavPanel}>
            <p>Menú principal</p>
            <WorkspaceNavigation
              label="Navegación móvil"
              role={role}
              unreadNotificationCount={unreadNotificationCount}
            />
          </div>
        </details>
        <Link
          aria-label="Inicio de Colaboradores DNA"
          className={styles.mobileBrand}
          href="/"
        >
          <Logo />
        </Link>
      </div>
      <div className={styles.breadcrumbs}>
        <Breadcrumbs items={getWorkspaceBreadcrumbs(pathname)} />
      </div>
      <div className={styles.tools}>
        <ThemeToggle />
        <AuthControls displayName={displayName} />
      </div>
    </header>
  );
}
