"use client";

/* eslint-disable @next/next/no-img-element */

import {
  ArrowLeft,
  Bell,
  Coffee,
  MoonStar,
  Sun,
  Sunset,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AuthControls } from "@/components/auth/auth-controls";
import { Logo } from "@/components/brand/logo/logo";
import { PwaInstallButton } from "@/components/pwa/pwa-install-button";
import { Breadcrumbs } from "@/components/ui/navigation/breadcrumbs";
import type { DashboardGreeting } from "@/features/dashboard/domain/dashboard-greeting";
import { getWorkspaceBreadcrumbs } from "@/features/navigation/workspace-navigation";

import styles from "./workspace-header.module.css";

type WorkspaceHeaderProps = {
  displayName: string;
  greeting: DashboardGreeting;
  profileImageUrl: string | null;
  unreadNotificationCount: number;
};

export function WorkspaceHeader({
  displayName,
  greeting,
  profileImageUrl,
  unreadNotificationCount,
}: WorkspaceHeaderProps) {
  const pathname = usePathname();
  const breadcrumbs = getWorkspaceBreadcrumbs(pathname);
  const parentDestination = [...breadcrumbs]
    .reverse()
    .flatMap((item) => ("href" in item ? [{ href: item.href, label: item.label }] : []))
    .at(0);
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
        {pathname === "/" || !parentDestination?.href ? (
          <Link
            aria-label="Inicio de Colaboradores DNA"
            className={styles.mobileBrand}
            href="/"
          >
            <Logo />
          </Link>
        ) : (
          <Link
            aria-label={`Volver a ${parentDestination.label}`}
            className={styles.mobileBack}
            href={parentDestination.href}
          >
            <ArrowLeft aria-hidden="true" size={22} />
          </Link>
        )}
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
        <Link
          aria-label={
            unreadNotificationCount > 0
              ? `${unreadNotificationCount} notificaciones sin leer`
              : "Notificaciones"
          }
          className={styles.notificationButton}
          href="/#notifications"
        >
          <Bell aria-hidden="true" size={20} />
          {unreadNotificationCount > 0 && (
            <span className={styles.notificationBadge}>
              {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
            </span>
          )}
        </Link>
        <PwaInstallButton />
        <span className={styles.desktopAccount}>
          <AuthControls displayName={displayName} />
        </span>
        <Link aria-label="Mi perfil" className={styles.mobileProfile} href="/perfil">
          {profileImageUrl ? (
            <img alt="" src={profileImageUrl} />
          ) : (
            <UserRound aria-hidden="true" size={20} />
          )}
        </Link>
      </div>
    </header>
  );
}
