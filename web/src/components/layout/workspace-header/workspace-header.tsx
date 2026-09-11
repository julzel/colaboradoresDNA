"use client";

/* eslint-disable @next/next/no-img-element */

import { ArrowLeft, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AuthControls } from "@/components/auth/auth-controls";
import { Logo } from "@/components/brand/logo/logo";
import { PwaInstallButton } from "@/components/pwa/pwa-install-button";
import { Breadcrumbs } from "@/components/ui/navigation/breadcrumbs";
import { getWorkspaceBreadcrumbs } from "@/features/navigation/workspace-navigation";

import styles from "./workspace-header.module.css";
import { NotificationDrawer } from "@/features/dashboard/components/notification-drawer";

type WorkspaceHeaderProps = {
  displayName: string;
  profileImageUrl: string | null;
  unreadNotificationCount: number;
};

export function WorkspaceHeader({
  displayName,
  profileImageUrl,
  unreadNotificationCount,
}: WorkspaceHeaderProps) {
  const pathname = usePathname();
  const breadcrumbs = getWorkspaceBreadcrumbs(pathname);
  const collaboratorEditPath = pathname.match(
    /^(\/admin\/colaboradores\/[^/]+)\/editar(?:\/|$)/,
  );
  const breadcrumbParent = [...breadcrumbs]
    .reverse()
    .flatMap((item) => ("href" in item ? [{ href: item.href, label: item.label }] : []))
    .at(0);
  const parentDestination = collaboratorEditPath
    ? { href: collaboratorEditPath[1]!, label: "Detalle" }
    : breadcrumbParent;
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
        <NotificationDrawer unreadCount={unreadNotificationCount} />
        <PwaInstallButton />
        <span className={styles.desktopAccount}>
          <AuthControls displayName={displayName} profileImageUrl={profileImageUrl} />
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
