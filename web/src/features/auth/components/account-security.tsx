"use client";
/* eslint-disable @next/next/no-img-element */
/* MFA transitions intentionally discard cached private RSC payloads with a full reload. */
/* eslint-disable @next/next/no-location-assign-relative-destination */
import { useState, type FormEvent } from "react";
import QRCode from "qrcode";
import { authClient } from "../client/auth-client";
import { Button } from "@/components/ui/button/button";
import { TextField } from "@/components/ui/form-field/form-field";
import styles from "./auth-form.module.css";

export function AccountSecurity({ enabled }: { enabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [qr, setQr] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [sessions, setSessions] = useState<
    Array<{ token: string; userAgent?: string | null | undefined }>
  >([]);
  const [verified, setVerified] = useState(false);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch {
      setMessage(
        "No pudimos completar la operación. Revisá tus datos e intentá de nuevo.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function enroll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(async () => {
      const result = await authClient.twoFactor.enable({
        password: String(form.get("password")),
      });
      if (
        result.error ||
        !result.data ||
        !("totpURI" in result.data) ||
        !result.data.totpURI
      )
        throw new Error("Enrollment failed");
      setQr(await QRCode.toDataURL(result.data.totpURI));
      setCodes(result.data.backupCodes ?? []);
    });
  }
  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code"));
    await run(async () => {
      const result = await authClient.twoFactor.verifyTotp({ code });
      if (result.error) throw new Error("Verification failed");
      setVerified(true);
      setQr("");
      setMessage(
        "Verificación completada. Guardá tus códigos de recuperación antes de continuar.",
      );
    });
  }
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(async () => {
      const result = await authClient.changePassword({
        currentPassword: String(form.get("currentPassword")),
        newPassword: String(form.get("newPassword")),
        revokeOtherSessions: true,
      });
      if (result.error) throw new Error("Password change failed");
      setMessage("Contraseña actualizada; las otras sesiones fueron cerradas.");
    });
  }
  async function regenerateCodes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password"));
    await run(async () => {
      const result = await authClient.twoFactor.generateBackupCodes({ password });
      if (result.error || !result.data) throw new Error("Recovery codes unavailable");
      setCodes(result.data.backupCodes);
      setMessage("Guardá estos códigos. Los anteriores ya no funcionan.");
    });
  }
  return (
    <div className={styles.form}>
      <section className={`${styles.panel} ${styles.form}`}>
        <h2>Verificación en dos pasos</h2>
        <p>
          Usá una aplicación de autenticación. Conservá los códigos de recuperación en
          un lugar seguro.
        </p>
        {!enabled && !qr && !verified && (
          <form className={styles.form} onSubmit={enroll}>
            <TextField
              id="mfa-password"
              name="password"
              label="Contraseña actual"
              type="password"
              autoComplete="current-password"
              required
            />
            <Button type="submit" disabled={busy}>
              Configurar autenticador
            </Button>
          </form>
        )}
        {qr && (
          <img
            className={styles.qr}
            src={qr}
            alt="Código QR para configurar tu aplicación de autenticación"
          />
        )}
        {(qr || enabled) && !verified && (
          <form className={styles.form} onSubmit={verify}>
            <TextField
              id="mfa-code"
              name="code"
              label="Código del autenticador"
              autoComplete="one-time-code"
              required
            />
            <Button type="submit" disabled={busy}>
              Verificar y continuar
            </Button>
          </form>
        )}
        {codes.length > 0 && (
          <>
            <h3>Códigos de recuperación</h3>
            <p>Se muestran ahora. Cada código se puede usar una sola vez.</p>
            <div className={styles.codes}>
              {codes.map((code) => (
                <code key={code}>{code}</code>
              ))}
            </div>
          </>
        )}
        {verified && (
          <Button onClick={() => window.location.assign("/")}>
            Ya guardé mis códigos. Continuar
          </Button>
        )}
        {enabled && (
          <form className={styles.form} onSubmit={regenerateCodes}>
            <TextField
              id="backup-password"
              name="password"
              label="Contraseña para renovar códigos de recuperación"
              type="password"
              autoComplete="current-password"
              required
            />
            <p>
              Los nuevos códigos reemplazarán todos los anteriores. Verificá primero el
              autenticador si esta sesión aún no lo hizo.
            </p>
            <Button type="submit" variant="secondary" disabled={busy}>
              Renovar códigos de recuperación
            </Button>
          </form>
        )}
      </section>
      <section className={`${styles.panel} ${styles.form}`}>
        <h2>Contraseña</h2>
        <form className={styles.form} onSubmit={changePassword}>
          <TextField
            id="current-password"
            name="currentPassword"
            label="Contraseña actual"
            type="password"
            autoComplete="current-password"
            required
          />
          <TextField
            id="new-password"
            name="newPassword"
            label="Nueva contraseña (mínimo 12 caracteres)"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
          />
          <Button type="submit" disabled={busy}>
            Cambiar contraseña
          </Button>
        </form>
      </section>
      <section className={`${styles.panel} ${styles.form}`}>
        <h2>Sesiones</h2>
        <Button
          disabled={busy}
          variant="secondary"
          onClick={() =>
            void run(async () => {
              const result = await authClient.listSessions();
              if (result.error) throw new Error("Sessions unavailable");
              setSessions(result.data ?? []);
            })
          }
        >
          Ver sesiones activas
        </Button>
        <ul className={styles.sessions}>
          {sessions.map((session) => (
            <li key={session.token}>
              <p>{session.userAgent || "Dispositivo"}</p>
              <Button
                disabled={busy}
                variant="danger"
                onClick={() =>
                  void run(async () => {
                    const result = await authClient.revokeSession({
                      token: session.token,
                    });
                    if (result.error) throw new Error("Revoke failed");
                    setSessions(
                      sessions.filter((item) => item.token !== session.token),
                    );
                  })
                }
              >
                Cerrar esta sesión
              </Button>
            </li>
          ))}
        </ul>
      </section>
      <p role="status" className={styles.message}>
        {message}
      </p>
    </div>
  );
}
