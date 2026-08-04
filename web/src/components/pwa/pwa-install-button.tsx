"use client";

import { Download, Share, SquarePlus } from "lucide-react";
import { useEffect, useState } from "react";

import { Modal } from "@/components/ui/modal/modal";

import styles from "./pwa-install-button.module.css";

type InstallChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (navigator as NavigatorWithStandalone).standalone === true
  );
}

function isIosDevice() {
  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosInstall, setShowIosInstall] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const detectionTimer = window.setTimeout(() => {
      const installed = isStandalone();
      setIsInstalled(installed);
      setShowIosInstall(isIosDevice() && !installed);
    }, 0);

    function handleInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function handleInstalled() {
      setInstallPrompt(null);
      setIsInstalled(true);
      setShowInstructions(false);
      setShowIosInstall(false);
    }

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.clearTimeout(detectionTimer);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!installPrompt) {
      setShowInstructions(true);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice.outcome === "accepted") setIsInstalled(true);
  }

  const canInstall = !isInstalled && (Boolean(installPrompt) || showIosInstall);

  return (
    <>
      {canInstall && (
        <button
          aria-label="Instalar aplicación"
          className={styles.installButton}
          onClick={() => void handleInstall()}
          title="Instalar aplicación"
          type="button"
        >
          <Download aria-hidden="true" size={18} />
        </button>
      )}

      {showInstructions && (
        <Modal
          description="Agregala a tu pantalla de inicio para abrirla como una aplicación."
          onClose={() => setShowInstructions(false)}
          title="Instalar Colaboradores DNA"
        >
          <ol className={styles.instructions}>
            <li>
              <span className={styles.instructionIcon}>
                <Share aria-hidden="true" size={20} />
              </span>
              Tocá el botón Compartir del navegador.
            </li>
            <li>
              <span className={styles.instructionIcon}>
                <SquarePlus aria-hidden="true" size={20} />
              </span>
              Seleccioná “Agregar a pantalla de inicio”.
            </li>
            <li>
              <span className={styles.stepNumber}>3</span>
              Confirmá tocando “Agregar”.
            </li>
          </ol>
        </Modal>
      )}
    </>
  );
}
