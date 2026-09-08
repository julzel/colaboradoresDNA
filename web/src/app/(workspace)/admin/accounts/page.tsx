import { ShieldCheck } from "lucide-react";
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
import { Container } from "@/components/ui/container/container";
import { PageSectionHeader } from "@/components/ui/page-section-header/page-section-header";
import { SubmitButton } from "@/components/ui/feedback/submit-button";
import { SelectField, TextField } from "@/components/ui/form-field/form-field";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";

import styles from "@/features/auth/components/account-administration.module.css";

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

function AccountStatus({ status }: { status: PlatformUserStatus }) {
  return (
    <StatusBadge
      tone={status === "active" ? "success" : status === "invited" ? "info" : "danger"}
    >
      {statusLabels[status]}
    </StatusBadge>
  );
}

function AccountActions({ actor, user }: { actor: PlatformUser; user: PlatformUser }) {
  return (
    <div className={styles.actions}>
      {user.status === "invited" && (
        <form action={resendPlatformInvitation}>
          <input name="platformUserId" type="hidden" value={user.id} />
          <SubmitButton pendingLabel="Reenviando…" size="small" variant="secondary">
            Reenviar
          </SubmitButton>
        </form>
      )}
      {user.status !== "deactivated" && user.id !== actor.id && (
        <form action={deactivatePlatformUser}>
          <input name="platformUserId" type="hidden" value={user.id} />
          <SubmitButton pendingLabel="Desactivando…" size="small" variant="danger">
            Desactivar
          </SubmitButton>
        </form>
      )}
      {user.status === "deactivated" && (
        <form action={reactivatePlatformUser}>
          <input name="platformUserId" type="hidden" value={user.id} />
          <SubmitButton pendingLabel="Reactivando…" size="small" variant="secondary">
            Reactivar
          </SubmitButton>
        </form>
      )}
    </div>
  );
}

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
                  <AccountStatus status={user.status} />
                </td>
                <td>
                  <AccountActions actor={actor} user={user} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul aria-label="Directorio de cuentas" className={styles.mobileList}>
        {users.map((user) => (
          <li className={styles.mobileItem} key={user.id}>
            <div className={styles.mobileIdentity}>
              <strong>{user.displayName}</strong>
              <span>{user.normalizedEmail}</span>
            </div>
            <div className={styles.mobileDetails}>
              <span>{roleLabels[user.role]}</span>
              <AccountStatus status={user.status} />
            </div>
            <AccountActions actor={actor} user={user} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default async function AccountsPage() {
  const actor = await getAccountAdministrationActor();

  return (
    <Container>
      <section className={styles.page}>
        <header className={styles.header}>
          <PageSectionHeader icon={ShieldCheck} title="Cuentas y acceso" />
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
    </Container>
  );
}
