import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo/logo";
import styles from "@/app/auth.module.css";

export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <main className={styles.shell} id="main-content">
      <section className={styles.brandPanel}>
        <Link
          className={styles.brand}
          href="/"
          aria-label="Ir al inicio de Colaboradores DNA"
        >
          <Logo priority />
          <span>Colaboradores</span>
        </Link>
        <div className={styles.brandCopy}>
          <p className={styles.eyebrow}>Espacio interno</p>
          <h1>Todo tu equipo, en un mismo lugar.</h1>
          <p>
            Consultá eventos, solicitudes y tareas operativas con acceso seguro para
            cada colaborador.
          </p>
        </div>
        <span className={styles.support}>
          Acceso exclusivo para personas invitadas.
        </span>
      </section>
      <section className={styles.formPanel} aria-label="Acceso a tu cuenta">
        <div className={styles.formContent}>{children}</div>
      </section>
    </main>
  );
}
