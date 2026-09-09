"use client";
import {
  cloneElement,
  isValidElement,
  useState,
  type ReactNode,
  type ReactElement,
} from "react";
import { authClient } from "../client/auth-client";
import { toast } from "sonner";

export function SignOutButton({
  children,
  redirectUrl = "/sign-in",
}: {
  children: ReactNode;
  redirectUrl?: string;
}) {
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Sign-out failed");
      window.location.assign(redirectUrl);
    } catch {
      toast.error("No pudimos cerrar la sesión. Intentá de nuevo.");
    } finally {
      setBusy(false);
    }
  }
  return isValidElement(children) ? (
    cloneElement(children as ReactElement<{ onClick: () => void; disabled: boolean }>, {
      onClick: () => void signOut(),
      disabled: busy,
    })
  ) : (
    <button onClick={() => void signOut()} disabled={busy}>
      Cerrar sesión
    </button>
  );
}
