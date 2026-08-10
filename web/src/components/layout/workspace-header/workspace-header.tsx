"use client";

import { Coffee, MoonStar, Sun, Sunset } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/brand/logo/logo";
import { PwaInstallButton } from "@/components/pwa/pwa-install-button";
import { Breadcrumbs } from "@/components/ui/navigation/breadcrumbs";
import type { DashboardGreeting } from "@/features/dashboard/domain/dashboard-greeting";
import { getWorkspaceBreadcrumbs } from "@/features/navigation/workspace-navigation";

import styles from "./workspace-header.module.css";

type WorkspaceHeaderProps = {
  displayName: string;
  greeting: DashboardGreeting;
};

export function WorkspaceHeader({ displayName, greeting }: WorkspaceHeaderProps) {
  const pathname = usePathname();
  const breadcrumbs = getWorkspaceBreadcrumbs(pathname);
  const pageTitle = breadcrumbs.at(-1)?.label ?? "Inicio";
  const firstName = displayName.trim().split(/\s+/)[0] || displayName;
  const GreetingIcon = {
    afternoon: Sunset,
    "late-night": Coffee,
    morning: Sun,
    night: MoonStar,
  }[greeting.period];

  return (
    <header className={styles.topbar}>
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
        {pathname === "/" && (
          <div className={styles.desktopGreeting}>
            <GreetingIcon aria-hidden="true" data-period={greeting.period} size={20} />
            <strong>
              {greeting.label} {firstName}
            </strong>
          </div>
        )}
        <PwaInstallButton />
      </div>
    </header>
  );
}
