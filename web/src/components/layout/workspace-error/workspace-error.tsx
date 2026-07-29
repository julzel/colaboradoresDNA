"use client";

import { CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/button/button";

import styles from "./workspace-error.module.css";

type WorkspaceErrorProps = {
  reset: () => void;
};

export function WorkspaceError({ reset }: WorkspaceErrorProps) {
  return (
    <section aria-labelledby="workspace-error-title" className={styles.error}>
      <CircleAlert aria-hidden="true" className={styles.icon} />
      <p className={styles.eyebrow}>Ocurrió un error</p>
      <h1 id="workspace-error-title">No pudimos cargar este contenido.</h1>
      <p>Intentá de nuevo. Si el problema continúa, regresá en unos minutos.</p>
      <Button onClick={reset}>Intentar de nuevo</Button>
    </section>
  );
}
