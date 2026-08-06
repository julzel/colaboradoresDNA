"use client";

import { Show, UserButton } from "@clerk/nextjs";
import { SunMoon, UserRound } from "lucide-react";

import { toggleTheme } from "@/components/ui/theme-toggle/theme-toggle";

import styles from "./auth-controls.module.css";

export function AuthControls({ displayName }: { displayName: string }) {
  return (
    <div className={styles.controls}>
      <Show when="signed-in">
        <span className={styles.displayName}>{displayName}</span>
        <UserButton
          appearance={{
            elements: {
              userButtonOuterIdentifier: styles.userName,
            },
          }}
          showName={false}
          userProfileMode="navigation"
          userProfileUrl="/account"
        >
          <UserButton.MenuItems>
            <UserButton.Link
              href="/perfil"
              label="Mi perfil"
              labelIcon={<UserRound aria-hidden="true" size={16} />}
            />
            <UserButton.Action
              label="Cambiar tema"
              labelIcon={<SunMoon aria-hidden="true" size={16} />}
              onClick={toggleTheme}
            />
            <UserButton.Action label="manageAccount" />
            <UserButton.Action label="signOut" />
          </UserButton.MenuItems>
        </UserButton>
      </Show>
    </div>
  );
}
