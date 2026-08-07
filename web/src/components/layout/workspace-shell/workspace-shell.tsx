import Link from "next/link";
import type { ReactNode } from "react";

import { AuthControls } from "@/components/auth/auth-controls";
import { Logo } from "@/components/brand/logo/logo";
import { MobileNavigation } from "@/components/layout/mobile-navigation/mobile-navigation";
import { WorkspaceHeader } from "@/components/layout/workspace-header/workspace-header";
import { WorkspaceNavigation } from "@/components/layout/workspace-navigation/workspace-navigation";
import type { PlatformRole } from "@/features/auth/domain/platform-user";

import styles from "./workspace-shell.module.css";

type WorkspaceShellProps = {
  children: ReactNode;
  displayName: string;
  role: PlatformRole;
  unreadNotificationCount: number;
};

export function WorkspaceShell({
  children,
  displayName,
  role,
  unreadNotificationCount,
}: WorkspaceShellProps) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link
          aria-label="Inicio de Colaboradores DNA"
          className={styles.brand}
          href="/"
        >
          <Logo priority />
          <span>Colaboradores</span>
        </Link>

        <p className={styles.navLabel}>Navegación</p>
        <WorkspaceNavigation
          role={role}
          unreadNotificationCount={unreadNotificationCount}
        />
        <div className={styles.sidebarAccount}>
          <p className={styles.navLabel}>Cuenta</p>
          <AuthControls displayName={displayName} />
        </div>
      </aside>

      <div className={styles.mainColumn}>
        <WorkspaceHeader />
        <main className={styles.content} id="main-content">
          {children}
        </main>
      </div>
      <MobileNavigation
        displayName={displayName}
        role={role}
        unreadNotificationCount={unreadNotificationCount}
      />
    </div>
  );
}
