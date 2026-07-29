import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

import { Button } from "@/components/ui/button/button";

import styles from "./auth-controls.module.css";

export function AuthControls() {
  return (
    <div className={styles.controls}>
      <Show treatPendingAsSignedOut when="signed-out">
        <SignInButton mode="modal">
          <Button size="small" variant="secondary">
            Iniciar sesión
          </Button>
        </SignInButton>
        <SignUpButton mode="modal">
          <Button size="small">Crear cuenta</Button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton showName />
      </Show>
    </div>
  );
}
