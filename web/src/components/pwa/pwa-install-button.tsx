"use client";

import { Download, Share, SquarePlus } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";

import { Modal } from "@/components/ui/modal/modal";
import { usePwaInstall } from "./pwa-install-provider";

import styles from "./pwa-install-button.module.css";

export function PwaInstallButton() {
  const { canPrompt, isInstalled, showIosInstall, install } = usePwaInstall();
  const [showInstructions, setShowInstructions] = useState(false);
  const canInstall = !isInstalled && (canPrompt || showIosInstall);

  return (
    <>
      {canInstall && (
        <button
          aria-label="Instalar aplicación"
          className={styles.installButton}
          onClick={() => (canPrompt ? void install() : setShowInstructions(true))}
          title="Instalar aplicación"
          type="button"
        >
          <Download aria-hidden="true" size={18} />
        </button>
      )}

      {showInstructions &&
        !isInstalled &&
        createPortal(
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
          </Modal>,
          document.body,
        )}
    </>
  );
}
