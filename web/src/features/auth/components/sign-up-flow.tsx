"use client";

import { MailCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ButtonLink } from "@/components/ui/button/button";

import { AuthForm } from "./auth-form";
import styles from "./auth-form.module.css";

export function SignUpFlow({
  invitation,
  invitedEmail,
}: {
  invitation?: string | undefined;
  invitedEmail?: string | undefined;
}) {
  const [complete, setComplete] = useState(false);
  const successTitle = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (complete) successTitle.current?.focus();
  }, [complete]);

  if (complete) {
    return (
      <section className={styles.success} aria-labelledby="sign-up-success-title">
        <span className={styles.successIcon} aria-hidden="true">
          <MailCheck size={32} strokeWidth={2} />
        </span>
        <p className={styles.eyebrow}>Cuenta creada</p>
        <h2 id="sign-up-success-title" ref={successTitle} tabIndex={-1}>
          Revisá tu correo
        </h2>
        <p>
          Enviamos un enlace de verificación a <strong>{invitedEmail}</strong>.
        </p>
        <ol className={styles.steps}>
          <li>Abrí el correo de Colaboradores DNA.</li>
          <li>Presioná el enlace para verificar tu dirección.</li>
          <li>Después, iniciá sesión con la contraseña que acabás de crear.</li>
        </ol>
        <p className={styles.hint}>Si no lo ves, revisá la carpeta de spam.</p>
        <ButtonLink href="/sign-in" fullWidth>
          Ir al inicio de sesión
        </ButtonLink>
      </section>
    );
  }

  return (
    <>
      <header className={styles.intro}>
        <h2 id="sign-up-title">Creá tu cuenta</h2>
        <p>
          Para entrar por primera vez, creá una contraseña nueva para Colaboradores DNA.
          Usarás este correo y tu contraseña para iniciar sesión.
        </p>
      </header>
      <AuthForm
        mode="sign-up"
        invitation={invitation}
        invitedEmail={invitedEmail}
        onSignUpComplete={() => setComplete(true)}
      />
    </>
  );
}
