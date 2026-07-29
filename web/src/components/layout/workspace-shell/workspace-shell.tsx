import Link from "next/link";
import type { ReactNode } from "react";

import { WorkspaceHeader } from "@/components/layout/workspace-header/workspace-header";
import {
  SideNavigation,
  type NavigationItem,
} from "@/components/ui/navigation/side-navigation";

import styles from "./workspace-shell.module.css";

type BreadcrumbItem = {
  href?: string;
  label: string;
};

type WorkspaceShellProps = {
  breadcrumbs: readonly BreadcrumbItem[];
  children: ReactNode;
  currentHref: string;
  navigationItems: readonly NavigationItem[];
};

export function WorkspaceShell({
  breadcrumbs,
  children,
  currentHref,
  navigationItems,
}: WorkspaceShellProps) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link
          aria-label="Inicio de Colaboradores DNA"
          className={styles.brand}
          href="/"
        >
          <span aria-hidden="true" className={styles.brandMark}>
            DNA
          </span>
          <span>Colaboradores</span>
        </Link>

        <p className={styles.navLabel}>Navegación</p>
        <SideNavigation currentHref={currentHref} items={navigationItems} />
      </aside>

      <div className={styles.mainColumn}>
        <WorkspaceHeader
          breadcrumbs={breadcrumbs}
          currentHref={currentHref}
          navigationItems={navigationItems}
        />
        <main className={styles.content} id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
