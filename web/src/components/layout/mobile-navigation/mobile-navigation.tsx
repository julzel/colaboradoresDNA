"use client";

/* eslint-disable @next/next/no-img-element */

import { SignOutButton } from "@clerk/nextjs";
import {
  LogOut,
  MoreHorizontal,
  ShieldCheck,
  SunMoon,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { toggleTheme } from "@/components/ui/theme-toggle/theme-toggle";
import type { PlatformRole } from "@/features/auth/domain/platform-user";
import {
  getActiveNavigationHref,
  getWorkspaceNavigation,
} from "@/features/navigation/workspace-navigation";

import styles from "./mobile-navigation.module.css";

type MobileNavigationProps = {
  displayName: string;
  profileImageUrl?: string | null;
  role: PlatformRole;
  unreadNotificationCount?: number;
};

const visibleTabCount = 3;

export function MobileNavigation({
  displayName,
  profileImageUrl = null,
  role,
  unreadNotificationCount = 0,
}: MobileNavigationProps) {
  const pathname = usePathname();
  const sheetId = useId();
  const sheetRef = useRef<HTMLDialogElement>(null);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const items = getWorkspaceNavigation(role, unreadNotificationCount);
  const currentHref = getActiveNavigationHref(pathname, items);
  const visibleItems = items.slice(0, visibleTabCount);
  const overflowItems = items.slice(visibleTabCount);
  const isOverflowCurrent =
    overflowItems.some((item) => item.href === currentHref) ||
    pathname.startsWith("/perfil") ||
    pathname.startsWith("/account");

  useEffect(() => {
    const sheet = sheetRef.current;

    if (!sheet) {
      return;
    }

    if (isMoreOpen && !sheet.open) {
      if (typeof sheet.showModal === "function") {
        sheet.showModal();
      } else {
        sheet.setAttribute("open", "");
      }

      return;
    }

    if (!isMoreOpen && sheet.open) {
      if (typeof sheet.close === "function") {
        sheet.close();
      } else {
        sheet.removeAttribute("open");
      }
    }
  }, [isMoreOpen]);

  return (
    <>
      <dialog
        aria-labelledby={`${sheetId}-title`}
        className={styles.sheet}
        id={sheetId}
        onCancel={(event) => {
          event.preventDefault();
          setIsMoreOpen(false);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            setIsMoreOpen(false);
          }
        }}
        onClose={() => setIsMoreOpen(false)}
        ref={sheetRef}
      >
        <div aria-hidden="true" className={styles.sheetHandle} />
        <div className={styles.sheetHeader}>
          <div>
            <p className={styles.sheetEyebrow}>Espacio de trabajo</p>
            <h2 id={`${sheetId}-title`}>Más opciones</h2>
          </div>
          <button
            aria-label="Cerrar menú"
            className={styles.closeButton}
            onClick={() => setIsMoreOpen(false)}
            type="button"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>
        <nav aria-label="Más destinos">
          <ul className={styles.sheetList}>
            {overflowItems.map((item) => {
              const Icon = item.icon;
              const isCurrent = item.href === currentHref;

              return (
                <li key={item.href}>
                  <Link
                    aria-current={isCurrent ? "page" : undefined}
                    className={styles.sheetLink}
                    href={item.href}
                    onClick={() => setIsMoreOpen(false)}
                  >
                    <span className={styles.sheetIcon}>
                      <Icon aria-hidden="true" size={20} />
                    </span>
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className={styles.sheetBadge}>{item.badge}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <section
          aria-labelledby={`${sheetId}-account`}
          className={styles.accountSection}
        >
          <p className={styles.accountLabel} id={`${sheetId}-account`}>
            Cuenta
          </p>
          <div className={styles.accountSummary}>
            <span className={styles.accountAvatar}>
              {profileImageUrl ? (
                <img alt="" src={profileImageUrl} />
              ) : (
                <UserRound aria-hidden="true" size={20} />
              )}
            </span>
            <strong>{displayName}</strong>
          </div>
          <ul className={styles.accountList}>
            <li>
              <Link
                className={styles.accountAction}
                href="/perfil"
                onClick={() => setIsMoreOpen(false)}
              >
                <UserRound aria-hidden="true" size={18} />
                Mi perfil
              </Link>
            </li>
            <li>
              <Link
                className={styles.accountAction}
                href="/account/security"
                onClick={() => setIsMoreOpen(false)}
              >
                <ShieldCheck aria-hidden="true" size={18} />
                Seguridad de la cuenta
              </Link>
            </li>
            <li>
              <button
                className={styles.accountAction}
                onClick={toggleTheme}
                type="button"
              >
                <SunMoon aria-hidden="true" size={18} />
                Cambiar tema
              </button>
            </li>
            <li>
              <SignOutButton redirectUrl="/sign-in">
                <button
                  className={styles.accountAction}
                  data-tone="danger"
                  type="button"
                >
                  <LogOut aria-hidden="true" size={18} />
                  Cerrar sesión
                </button>
              </SignOutButton>
            </li>
          </ul>
        </section>
      </dialog>

      <nav aria-label="Navegación móvil" className={styles.tabBar}>
        <ul className={styles.tabList}>
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isCurrent = item.href === currentHref;

            return (
              <li key={item.href}>
                <Link
                  aria-current={isCurrent ? "page" : undefined}
                  className={styles.tab}
                  href={item.href}
                  onClick={() => setIsMoreOpen(false)}
                >
                  <span className={styles.tabIcon}>
                    <Icon aria-hidden="true" size={22} />
                    {item.badge && (
                      <span
                        aria-label={`${item.badge} sin leer`}
                        className={styles.badge}
                      >
                        {item.badge}
                      </span>
                    )}
                  </span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              aria-controls={sheetId}
              aria-current={isOverflowCurrent ? "page" : undefined}
              aria-expanded={isMoreOpen}
              className={styles.tab}
              onClick={() => setIsMoreOpen((isOpen) => !isOpen)}
              type="button"
            >
              <span className={styles.tabIcon}>
                <MoreHorizontal aria-hidden="true" size={22} />
              </span>
              <span>Más</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
