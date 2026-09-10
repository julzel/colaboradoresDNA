"use client";
/* Auth transitions intentionally discard cached private RSC payloads with a full reload. */
/* eslint-disable @next/next/no-location-assign-relative-destination */
import { useState, type FormEvent } from "react";
import { authClient } from "../client/auth-client";
import { Button, ButtonLink } from "@/components/ui/button/button";
import { TextField } from "@/components/ui/form-field/form-field";
import styles from "./auth-form.module.css";
import { OneTimeCodeField } from "./one-time-code-field";

export function AuthForm({
  mode = "sign-in",
  invitation = "",
  invitedEmail = "",
  resetToken = "",
  onSignUpComplete,
}: {
  mode?: "sign-in" | "sign-up" | "reset";
  invitation?: string | undefined;
  invitedEmail?: string | undefined;
  resetToken?: string | undefined;
  onSignUpComplete?: (() => void) | undefined;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [recover, setRecover] = useState(false);
  const [challenge, setChallenge] = useState(false);
  const [backup, setBackup] = useState(false);
  const [challengeCode, setChallengeCode] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get("email") ?? "");
    const password = String(fields.get("password") ?? "");
    try {
      if (challenge) {
        const code = challengeCode;
        const result = backup
          ? await authClient.twoFactor.verifyBackupCode({ code })
          : await authClient.twoFactor.verifyTotp({ code });
        if (result.error) {
          setMessage("El código no es válido o venció. Intentá de nuevo.");
          return;
        }
        window.location.assign("/");
      } else if (recover) {
        await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
        setMessage(
          "Si la cuenta existe, recibirás un enlace para restablecer tu contraseña.",
        );
      } else if (mode === "reset") {
        const result = await authClient.resetPassword({
          token: resetToken,
          newPassword: password,
        });
        setMessage(
          result.error
            ? "El enlace venció o la contraseña no cumple los requisitos."
            : "Contraseña actualizada. Ya podés iniciar sesión.",
        );
      } else if (mode === "sign-up") {
        const result = await authClient.signUp.email(
          { email, password, name: "Persona invitada", callbackURL: "/sign-in" },
          { headers: { "x-invitation-token": invitation } },
        );
        if (result.error) {
          setMessage(
            "No pudimos completar el registro. Revisá tu invitación o intentá iniciar sesión si ya creaste la cuenta.",
          );
        } else {
          onSignUpComplete?.();
        }
      } else {
        const result = await authClient.signIn.email({ email, password });
        if (result.error) {
          setMessage(
            "No pudimos iniciar sesión. Revisá tus datos y verificá tu correo; si está pendiente, te enviamos otro enlace.",
          );
          return;
        }
        if (
          result.data &&
          "twoFactorRedirect" in result.data &&
          result.data.twoFactorRedirect
        ) {
          setChallengeCode("");
          setChallenge(true);
        } else window.location.assign("/");
      }
    } catch {
      setMessage("No pudimos conectar. Intentá de nuevo.");
    } finally {
      setBusy(false);
    }
  }
  if (mode === "sign-up" && (!invitation || !invitedEmail))
    return (
      <p>Necesitás una invitación vigente. Solicitá el enlace a administración.</p>
    );
  return (
    <form className={styles.form} onSubmit={submit}>
      {mode !== "sign-up" && (
        <header className={styles.intro}>
          <h2>
            {challenge
              ? "Verificá tu identidad"
              : recover
                ? "Recuperá tu contraseña"
                : mode === "reset"
                  ? "Restablecé tu contraseña"
                  : "Te damos la bienvenida"}
          </h2>
          <p>
            {challenge
              ? backup
                ? "Ingresá uno de los códigos de recuperación que guardaste al configurar la seguridad de tu cuenta."
                : "Confirmá el inicio de sesión con tu aplicación de autenticación."
              : recover
                ? "Te enviaremos un enlace para crear una contraseña nueva."
                : mode === "reset"
                  ? "Elegí una contraseña nueva para volver a entrar a tu cuenta."
                  : "Iniciá sesión para entrar al espacio de trabajo."}
          </p>
        </header>
      )}
      {challenge ? (
        <>
          {backup ? (
            <TextField
              autoComplete="off"
              id="auth-recovery-code"
              key="recovery-code"
              label="Código de recuperación"
              name="code"
              onChange={(event) => setChallengeCode(event.currentTarget.value)}
              value={challengeCode}
              required
            />
          ) : (
            <OneTimeCodeField
              disabled={busy}
              key="authenticator-code"
              onChange={setChallengeCode}
              value={challengeCode}
            />
          )}
        </>
      ) : (
        <>
          {mode !== "reset" && (
            <TextField
              id="auth-email"
              name="email"
              label="Correo electrónico"
              type="email"
              autoComplete="email"
              defaultValue={invitedEmail}
              readOnly={mode === "sign-up"}
              description={
                mode === "sign-up"
                  ? "Este es el correo que recibió la invitación."
                  : undefined
              }
              required
            />
          )}
          {!recover && (
            <TextField
              id="auth-password"
              name="password"
              label={
                mode === "reset"
                  ? "Nueva contraseña"
                  : mode === "sign-up"
                    ? "Creá tu contraseña"
                    : "Contraseña"
              }
              description={
                mode !== "sign-in"
                  ? "Usá al menos 12 caracteres. Podés combinar varias palabras para recordarla fácilmente."
                  : undefined
              }
              type="password"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              minLength={mode === "sign-in" ? undefined : 12}
              maxLength={128}
              required
            />
          )}
        </>
      )}
      <Button disabled={busy} type="submit" fullWidth>
        {busy
          ? "Procesando…"
          : challenge
            ? "Verificar código"
            : recover
              ? "Enviar enlace de recuperación"
              : mode === "sign-up"
                ? "Crear cuenta"
                : mode === "reset"
                  ? "Guardar contraseña"
                  : "Iniciar sesión"}
      </Button>
      {challenge && (
        <div className={styles.alternateMethod}>
          <p>
            {backup
              ? "¿Volviste a tener acceso a tu aplicación?"
              : "¿No tenés acceso a tu aplicación de autenticación?"}
          </p>
          <Button
            disabled={busy}
            fullWidth
            variant="secondary"
            onClick={() => {
              setBackup(!backup);
              setChallengeCode("");
              setMessage("");
            }}
          >
            {backup ? "Usar código de la aplicación" : "Usar un código de recuperación"}
          </Button>
        </div>
      )}
      {mode === "sign-up" && (
        <p className={styles.message}>
          Después de crear tu cuenta, recibirás otro correo para verificar tu dirección.
          Abrí ese enlace antes de iniciar sesión.
        </p>
      )}
      <p aria-live="polite" className={styles.message}>
        {message}
      </p>
      {mode === "sign-in" && !challenge && (
        <Button
          variant="quiet"
          onClick={() => {
            setRecover(!recover);
            setMessage("");
          }}
        >
          {recover ? "Volver al inicio de sesión" : "Olvidé mi contraseña"}
        </Button>
      )}
      {mode !== "sign-in" && (
        <ButtonLink href="/sign-in" variant="quiet" fullWidth>
          Volver al inicio de sesión
        </ButtonLink>
      )}
    </form>
  );
}
