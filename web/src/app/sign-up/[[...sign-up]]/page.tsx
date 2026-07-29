import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

import styles from "@/app/auth.module.css";

export default function SignUpPage() {
  return (
    <main className={styles.shell} id="main-content">
      <section className={styles.brandPanel}>
        <Link
          className={styles.brand}
          href="/"
          aria-label="Ir al inicio de Colaboradores DNA"
        >
          <span className={styles.brandMark} aria-hidden="true">
            DNA
          </span>
          <span>Colaboradores</span>
        </Link>
        <div className={styles.brandCopy}>
          <p className={styles.eyebrow}>Acceso por invitación</p>
          <h1>Activa tu espacio de trabajo.</h1>
          <p>
            Completa el registro con el correo que recibió la invitación de tu
            administrador.
          </p>
        </div>
        <span className={styles.support}>Tu acceso está protegido por Clerk.</span>
      </section>
      <section className={styles.formPanel} aria-labelledby="sign-up-title">
        <div className={styles.formContent}>
          <header className={styles.formIntro}>
            <h2 id="sign-up-title">Crea tu cuenta</h2>
            <p>Usa la invitación enviada por el equipo administrador.</p>
          </header>
          <SignUp />
        </div>
      </section>
    </main>
  );
}
