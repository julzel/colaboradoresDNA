"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { type ReactNode, useSyncExternalStore } from "react";

import { Logo } from "@/components/brand/logo/logo";
import { MobileNavigation } from "@/components/layout/mobile-navigation/mobile-navigation";
import { WorkspaceHeader } from "@/components/layout/workspace-header/workspace-header";
import { WorkspaceNavigation } from "@/components/layout/workspace-navigation/workspace-navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle/theme-toggle";
import type { PlatformRole } from "@/features/auth/domain/platform-user";
import type { DashboardGreeting } from "@/features/dashboard/domain/dashboard-greeting";

import styles from "./workspace-shell.module.css";

const sidebarStorageKey = "colaboradores-sidebar-expanded";
const sidebarPreferenceEvent = "colaboradores-sidebar-preference";

function subscribeToSidebarPreference(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(sidebarPreferenceEvent, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(sidebarPreferenceEvent, onStoreChange);
  };
}

function getSidebarPreference() {
  return window.localStorage.getItem(sidebarStorageKey) === "true";
}

function getServerSidebarPreference() {
  return false;
}

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
  const isSidebarExpanded = useSyncExternalStore(
    subscribeToSidebarPreference,
    getSidebarPreference,
    getServerSidebarPreference,
  );

  function toggleSidebar() {
    window.localStorage.setItem(sidebarStorageKey, String(!isSidebarExpanded));
    window.dispatchEvent(new Event(sidebarPreferenceEvent));
  }

  return (
    <div
      className={`${styles.shell} ${isSidebarExpanded ? styles.sidebarExpanded : ""}`}
    >
      <aside className={styles.sidebar} id="workspace-sidebar">
        <Link
          aria-label="Inicio de Colaboradores DNA"
          className={styles.brand}
          href="/"
        >
          <Logo priority tone="light" />
        </Link>

        <WorkspaceNavigation
          expanded={isSidebarExpanded}
          role={role}
          unreadNotificationCount={unreadNotificationCount}
        />
        <button
          aria-controls="workspace-sidebar"
          aria-expanded={isSidebarExpanded}
          aria-label={isSidebarExpanded ? "Contraer navegación" : "Expandir navegación"}
          className={styles.sidebarToggle}
          onClick={toggleSidebar}
          title={isSidebarExpanded ? "Contraer navegación" : "Expandir navegación"}
          type="button"
        >
          <ChevronRight
            aria-hidden="true"
            className={styles.sidebarToggleIcon}
            size={18}
          />
        </button>
        <div className={styles.sidebarFooter}>
          <span className={styles.sidebarTheme}>
            <ThemeToggle />
          </span>
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
