import { Show, UserButton } from "@clerk/nextjs";

import styles from "./auth-controls.module.css";

export function AuthControls() {
  return (
    <div className={styles.controls}>
      <Show when="signed-in">
        <UserButton
          appearance={{
            elements: {
              userButtonOuterIdentifier: styles.userName,
            },
          }}
          showName
          userProfileMode="navigation"
          userProfileUrl="/account"
        />
      </Show>
    </div>
  );
}
