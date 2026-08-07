"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/brand/logo/logo";
import { PwaInstallButton } from "@/components/pwa/pwa-install-button";
import { Breadcrumbs } from "@/components/ui/navigation/breadcrumbs";
import { getWorkspaceBreadcrumbs } from "@/features/navigation/workspace-navigation";

import styles from "./workspace-header.module.css";

export function WorkspaceHeader() {
  const pathname = usePathname();
  const breadcrumbs = getWorkspaceBreadcrumbs(pathname);
  const pageTitle = breadcrumbs.at(-1)?.label ?? "Inicio";

  return (
    <header
      className={styles.topbar}
      data-overlay={pathname === "/" ? "true" : undefined}
    >
      <div className={styles.mobileLeading}>
        <Link
          aria-label="Inicio de Colaboradores DNA"
          className={styles.mobileBrand}
          href="/"
        >
          <Logo />
        </Link>
        <div className={styles.mobileContext}>
          <span>Colaboradores</span>
          <strong>{pageTitle}</strong>
        </div>
      </div>
      <div className={styles.breadcrumbs}>
        <Breadcrumbs items={breadcrumbs} />
      </div>
      <div className={styles.tools}>
        <PwaInstallButton />
      </div>
    </header>
  );
}
