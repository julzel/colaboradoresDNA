import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo/logo";
import { WorkspaceHeader } from "@/components/layout/workspace-header/workspace-header";
import { WorkspaceNavigation } from "@/components/layout/workspace-navigation/workspace-navigation";
import type { PlatformRole } from "@/features/auth/domain/platform-user";

import styles from "./workspace-shell.module.css";

type WorkspaceShellProps = {
  children: ReactNode;
  role: PlatformRole;
};

export function WorkspaceShell({ children, role }: WorkspaceShellProps) {
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
        <WorkspaceNavigation role={role} />
      </aside>

      <div className={styles.mainColumn}>
        <WorkspaceHeader role={role} />
        <main className={styles.content} id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
