import Link from "next/link";
import { Suspense } from "react";

import {
  deactivatePlatformUser,
  invitePlatformUser,
  reactivatePlatformUser,
  resendPlatformInvitation,
} from "@/features/auth/actions/admin-account-actions";
import { AccountDirectorySkeleton } from "@/features/auth/components/account-directory-skeleton";
import type {
  PlatformRole,
  PlatformUser,
  PlatformUserStatus,
} from "@/features/auth/domain/platform-user";
import {
  getAccountAdministrationActor,
  listAccountsForAdministration,
} from "@/features/auth/server/account-query-service";
import { Card, CardBody, CardHeader } from "@/components/ui/card/card";
import { SubmitButton } from "@/components/ui/feedback/submit-button";
import { SelectField, TextField } from "@/components/ui/form-field/form-field";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";

import styles from "@/app/admin/accounts/accounts.module.css";

const roleLabels: Record<PlatformRole, string> = {
  administrator: "Administrador",
  collaborator: "Colaborador",
  supervisor: "Supervisor",
};

const statusLabels: Record<PlatformUserStatus, string> = {
  active: "Activo",
  deactivated: "Desactivado",
  invited: "Invitado",
};

async function AccountDirectory({ actor }: { actor: PlatformUser }) {
  const users = await listAccountsForAdministration();

  return (
    <Card className={styles.directory}>
      <CardHeader
        description={`${users.length} cuentas registradas en la plataforma.`}
        title="Directorio de acceso"
      />
      <div
        aria-label="Directorio de cuentas"
        className={styles.tableWrap}
        role="region"
        tabIndex={0}
      >
        <table className={styles.table}>
          <caption>Cuentas y estado de acceso</caption>
          <thead>
            <tr>
              <th scope="col">Persona</th>
              <th scope="col">Rol</th>
              <th scope="col">Estado</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.displayName}</strong>
                  <span>{user.normalizedEmail}</span>
                </td>
                <td>{roleLabels[user.role]}</td>
                <td>
                  <StatusBadge
                    tone={
                      user.status === "active"
                        ? "success"
                        : user.status === "invited"
                          ? "info"
                          : "danger"
                    }
                  >
                    {statusLabels[user.status]}
                  </StatusBadge>
                </td>
                <td>
                  <div className={styles.actions}>
                    {user.status === "invited" && (
                      <form action={resendPlatformInvitation}>
                        <input name="platformUserId" type="hidden" value={user.id} />
                        <SubmitButton
                          pendingLabel="Reenviando…"
                          size="small"
                          variant="secondary"
                        >
                          Reenviar
                        </SubmitButton>
                      </form>
                    )}
                    {user.status !== "deactivated" && user.id !== actor.id && (
                      <form action={deactivatePlatformUser}>
                        <input name="platformUserId" type="hidden" value={user.id} />
                        <SubmitButton
                          pendingLabel="Desactivando…"
                          size="small"
                          variant="danger"
                        >
                          Desactivar
                        </SubmitButton>
                      </form>
                    )}
                    {user.status === "deactivated" && (
                      <form action={reactivatePlatformUser}>
                        <input name="platformUserId" type="hidden" value={user.id} />
                        <SubmitButton
                          pendingLabel="Reactivando…"
                          size="small"
                          variant="secondary"
                        >
                          Reactivar
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default async function AccountsPage() {
  const actor = await getAccountAdministrationActor();

  return (
    <section className={styles.shell}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Administración</p>
          <h1>Cuentas y acceso</h1>
          <p>
            Invitá personas, reenviá accesos vencidos y desactivá cuentas sin borrar su
            historial.
          </p>
        </div>
        <Link className={styles.backLink} href="/admin">
          Volver a administración
        </Link>
      </header>

      <div className={styles.grid}>
        <Card>
          <CardHeader
            description="Clerk enviará un enlace de registro válido por 14 días."
            title="Invitar una persona"
          />
          <CardBody>
            <form action={invitePlatformUser} className={styles.form}>
              <TextField
                autoComplete="name"
                id="display-name"
                label="Nombre completo"
                name="displayName"
                required
              />
              <TextField
                autoComplete="email"
                id="email"
                label="Correo electrónico personal"
                name="email"
                required
                type="email"
              />
              <SelectField id="role" label="Rol" name="role" required>
                <option value="collaborator">Colaborador</option>
                <option value="supervisor">Supervisor</option>
                <option value="administrator">Administrador</option>
              </SelectField>
              <SubmitButton pendingLabel="Enviando invitación…">
                Enviar invitación
              </SubmitButton>
            </form>
          </CardBody>
        </Card>

        <Suspense fallback={<AccountDirectorySkeleton />}>
          <AccountDirectory actor={actor} />
        </Suspense>
      </div>
    </section>
  );
}
