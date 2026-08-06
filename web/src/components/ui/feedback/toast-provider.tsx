"use client";

import { CircleAlert, CircleCheck, CircleX, Info, X } from "lucide-react";
import { Suspense, useSyncExternalStore } from "react";
import { Toaster } from "sonner";

import { FeedbackBridge } from "@/components/ui/feedback/feedback-bridge";

import styles from "./toast-provider.module.css";

const mobileMediaQuery = "(width <= 40rem)";

function subscribeToViewportChange(onChange: () => void) {
  const mediaQuery = window.matchMedia(mobileMediaQuery);
  mediaQuery.addEventListener("change", onChange);

  return () => mediaQuery.removeEventListener("change", onChange);
}

function getViewportSnapshot() {
  return window.matchMedia(mobileMediaQuery).matches;
}

function getServerViewportSnapshot() {
  return false;
}

export function ToastProvider() {
  const isMobile = useSyncExternalStore(
    subscribeToViewportChange,
    getViewportSnapshot,
    getServerViewportSnapshot,
  );

  return (
    <>
      <Suspense fallback={null}>
        <FeedbackBridge />
      </Suspense>
      <Toaster
        closeButton
        containerAriaLabel="Notificaciones"
        expand
        icons={{
          close: <X aria-hidden="true" />,
          error: <CircleX aria-hidden="true" />,
          info: <Info aria-hidden="true" />,
          success: <CircleCheck aria-hidden="true" />,
          warning: <CircleAlert aria-hidden="true" />,
        }}
        mobileOffset={{ bottom: "calc(5.25rem + env(safe-area-inset-bottom))" }}
        position={isMobile ? "bottom-center" : "top-right"}
        toastOptions={{
          closeButtonAriaLabel: "Cerrar notificación",
          classNames: {
            closeButton: styles.closeButton ?? "",
            content: styles.content ?? "",
            error: styles.error ?? "",
            icon: styles.icon ?? "",
            info: styles.info ?? "",
            success: styles.success ?? "",
            title: styles.title ?? "",
            toast: styles.toast ?? "",
            warning: styles.warning ?? "",
          },
          unstyled: true,
        }}
        visibleToasts={3}
      />
    </>
  );
}
