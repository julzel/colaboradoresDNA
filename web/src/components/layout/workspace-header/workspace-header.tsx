import { AuthControls } from "@/components/auth/auth-controls";
import { Breadcrumbs } from "@/components/ui/navigation/breadcrumbs";
import {
  SideNavigation,
  type NavigationItem,
} from "@/components/ui/navigation/side-navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle/theme-toggle";

import styles from "./workspace-header.module.css";

type BreadcrumbItem = {
  href?: string;
  label: string;
};

type WorkspaceHeaderProps = {
  breadcrumbs: readonly BreadcrumbItem[];
  currentHref: string;
  navigationItems: readonly NavigationItem[];
};

export function WorkspaceHeader({
  breadcrumbs,
  currentHref,
  navigationItems,
}: WorkspaceHeaderProps) {
  return (
    <header className={styles.topbar}>
      <details className={styles.mobileNav}>
        <summary>Abrir navegación</summary>
        <SideNavigation
          currentHref={currentHref}
          items={navigationItems}
          label="Navegación móvil"
        />
      </details>
      <Breadcrumbs items={breadcrumbs} />
      <div className={styles.tools}>
        <ThemeToggle />
        <AuthControls />
      </div>
    </header>
  );
}
