import { UserProfile } from "@clerk/nextjs";
import Link from "next/link";

import { requiresMfa } from "@/features/auth/domain/platform-user";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";

import styles from "./account.module.css";

export default async function AccountPage() {
  const { clerkTwoFactorEnabled, platformUser } = await requirePlatformUser({
    allowMfaSetup: true,
  });
  const mfaRequired = requiresMfa(platformUser.role) && !clerkTwoFactorEnabled;

  return (
    <main className={styles.shell} id="main-content">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Seguridad de la cuenta</p>
          <h1>Administrá tu cuenta</h1>
          <p>
            Revisá tus métodos de acceso, verificación en dos pasos y sesiones activas.
          </p>
        </div>
        <Link className={styles.backLink} href="/">
          Volver al espacio de trabajo
        </Link>
      </header>

      {mfaRequired && (
        <div className={styles.alert} role="alert">
          <strong>La verificación en dos pasos es obligatoria para tu rol.</strong>
          <span>
            Configurá una aplicación de autenticación en la sección de seguridad para
            continuar al espacio de trabajo.
          </span>
        </div>
      )}

      <div className={styles.profile}>
        <UserProfile path="/account" routing="path" />
      </div>
    </main>
  );
}
