"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ChevronDown, LogOut, Moon, ShieldCheck, UserRound } from "lucide-react";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { toggleTheme } from "@/components/ui/theme-toggle/theme-toggle";
import styles from "./auth-controls.module.css";

type AuthControlsProps = {
  displayName: string;
  profileImageUrl?: string | null;
};

export function AuthControls({
  displayName,
  profileImageUrl = null,
}: AuthControlsProps) {
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !menu.current?.contains(event.target) &&
        menu.current
      ) {
        menu.current.open = false;
      }
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" && menu.current?.open) {
        menu.current.open = false;
        menu.current.querySelector("summary")?.focus();
      }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  function close() {
    if (menu.current) menu.current.open = false;
  }
  return (
    <div className={styles.controls}>
      <details ref={menu}>
        <summary className={styles.trigger}>
          <span className={styles.avatar} aria-hidden="true">
            {profileImageUrl ? (
              <img alt="" src={profileImageUrl} />
            ) : (
              <UserRound size={18} />
            )}
          </span>
          <span className={styles.name}>{displayName}</span>
          <ChevronDown className={styles.chevron} size={16} aria-hidden="true" />
        </summary>
        <nav aria-label="Mi cuenta">
          <div className={styles.heading}>
            <span>Mi cuenta</span>
            <strong>{displayName}</strong>
          </div>
          <Link className={styles.item} href="/perfil" onClick={close}>
            <UserRound size={18} aria-hidden="true" />
            Mi perfil
          </Link>
          <Link className={styles.item} href="/account/security" onClick={close}>
            <ShieldCheck size={18} aria-hidden="true" />
            Seguridad de la cuenta
          </Link>
          <button className={styles.item} type="button" onClick={toggleTheme}>
            <Moon size={18} aria-hidden="true" />
            Cambiar tema
          </button>
          <div className={styles.footer}>
            <SignOutButton>
              <button className={`${styles.item} ${styles.signOut}`} type="button">
                <LogOut size={18} aria-hidden="true" />
                Cerrar sesión
              </button>
            </SignOutButton>
          </div>
        </nav>
      </details>
    </div>
  );
}
