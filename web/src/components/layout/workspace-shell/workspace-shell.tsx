import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo/logo";
import { MobileNavigation } from "@/components/layout/mobile-navigation/mobile-navigation";
import { WorkspaceHeader } from "@/components/layout/workspace-header/workspace-header";
import { WorkspaceNavigation } from "@/components/layout/workspace-navigation/workspace-navigation";
import type { PlatformRole } from "@/features/auth/domain/platform-user";
import type { DashboardGreeting } from "@/features/dashboard/domain/dashboard-greeting";

import styles from "./workspace-shell.module.css";

type WorkspaceShellProps = {
  children: ReactNode;
  displayName: string;
  greeting: DashboardGreeting;
  profileImageUrl: string | null;
  role: PlatformRole;
  unreadNotificationCount: number;
};

export function WorkspaceShell({
  children,
  displayName,
  greeting,
  profileImageUrl,
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
          <Logo priority tone="light" />
          <span className={styles.brandCopy}>Colaboradores</span>
        </Link>

        <WorkspaceNavigation
          role={role}
          unreadNotificationCount={unreadNotificationCount}
        />
        <div className={styles.sidebarFooter}>
          <span aria-hidden="true" className={styles.footerMark} />
          <p>
            Personas que hacen crecer
            <br />a nuestra empresa.
          </p>
        </div>
      </aside>

      <div className={styles.mainColumn}>
        <WorkspaceHeader
          displayName={displayName}
          greeting={greeting}
          profileImageUrl={profileImageUrl}
          unreadNotificationCount={unreadNotificationCount}
        />
        <main className={styles.content} id="main-content">
          {children}
        </main>
      </div>
      <MobileNavigation
        displayName={displayName}
        profileImageUrl={profileImageUrl}
        role={role}
        unreadNotificationCount={unreadNotificationCount}
      />
    </div>
  );
}
