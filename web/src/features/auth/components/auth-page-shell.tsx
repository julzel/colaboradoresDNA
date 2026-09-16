import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo/logo";
import styles from "@/app/auth.module.css";

export function AuthPageShell({
  children,
  compactOnMobile = false,
}: {
  children: ReactNode;
  compactOnMobile?: boolean;
}) {
  return (
    <main
      className={
        compactOnMobile ? `${styles.shell} ${styles.compactOnMobile}` : styles.shell
      }
      id="main-content"
    >
      <section className={styles.brandPanel}>
        <Link
          className={styles.brand}
          href="/"
          aria-label="Ir al inicio de Colaboradores DNA"
        >
          <span>Colaboradores</span>
          <Logo className={styles.compactLogo ?? ""} priority tone="light" />
        </Link>
        <div className={styles.brandCopy}>
          <p className={styles.eyebrow}>Espacio interno</p>
          <h1>¡Bienvenido, equipo!</h1>
          <p>
            Consultá eventos, solicitudes y tareas operativas.
          </p>
        </div>
      </section>
      <section className={styles.formPanel} aria-label="Acceso a tu cuenta">
        <div className={styles.formContent}>
          {compactOnMobile && (
            <Link
              className={styles.compactBrand}
              href="/"
              aria-label="Ir al inicio de Colaboradores DNA"
            >
              <span>Colaboradores</span>
              <Logo className={styles.compactLogo ?? ""} priority tone="light" />
            </Link>
          )}
          {children}
        </div>
      </section>
    </main>
  );
}
