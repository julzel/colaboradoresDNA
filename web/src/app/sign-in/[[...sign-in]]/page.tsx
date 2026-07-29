import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

import styles from "@/app/auth.module.css";
import { Logo } from "@/components/brand/logo/logo";

export default function SignInPage() {
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
            Consulta eventos, solicitudes y tareas operativas con acceso seguro para
            cada colaborador.
          </p>
        </div>
        <span className={styles.support}>
          Acceso exclusivo para personas invitadas.
        </span>
      </section>
      <section className={styles.formPanel} aria-labelledby="sign-in-title">
        <div className={styles.formContent}>
          <header className={styles.formIntro}>
            <h2 id="sign-in-title">Te damos la bienvenida</h2>
            <p>Inicia sesión para entrar al espacio de trabajo.</p>
          </header>
          <SignIn />
        </div>
      </section>
    </main>
  );
}
