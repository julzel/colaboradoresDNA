import { Show, UserButton } from "@clerk/nextjs";

import styles from "./auth-controls.module.css";

export function AuthControls() {
  return (
    <div className={styles.controls}>
      <Show when="signed-in">
        <UserButton showName userProfileMode="navigation" userProfileUrl="/account" />
      </Show>
    </div>
  );
}
