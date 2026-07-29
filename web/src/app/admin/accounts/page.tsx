import Link from "next/link";

import {
  deactivatePlatformUser,
  invitePlatformUser,
  reactivatePlatformUser,
  resendPlatformInvitation,
} from "@/features/auth/actions/admin-account-actions";
import type {
  PlatformRole,
  PlatformUserStatus,
} from "@/features/auth/domain/platform-user";
import { listPlatformUsers } from "@/features/auth/server/platform-user-repository";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";
import { Button } from "@/components/ui/button/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card/card";
import { SelectField, TextField } from "@/components/ui/form-field/form-field";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";

import styles from "./accounts.module.css";

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

const notices = {
  account_deactivated: "La cuenta fue desactivada y sus sesiones se revocaron.",
  account_reactivated: "La cuenta fue reactivada.",
  invitation_resent: "La invitación fue revocada y enviada nuevamente.",
  invitation_sent: "La invitación fue enviada.",
} as const;

const errors = {
  account_exists: "Ya existe una cuenta con ese correo.",
  deactivated_sync_pending:
    "La cuenta ya no puede entrar, pero la revocación en Clerk debe reintentarse.",
  deactivation_failed: "No fue posible desactivar la cuenta.",
  invalid_account: "La cuenta seleccionada no es válida.",
  invalid_deactivation: "No podés desactivar tu propia cuenta.",
  invalid_invitation: "Revisá el nombre, correo y rol de la invitación.",
  invitation_failed:
    "No fue posible enviar la invitación. El registro quedó pendiente para reintentar.",
  invitation_not_pending: "Esta cuenta ya no tiene una invitación pendiente.",
  reactivation_failed: "No fue posible reactivar la cuenta.",
  reactivation_sync_failed:
    "Clerk no pudo desbloquear la identidad. La cuenta permanece desactivada.",
} as const;

function getMessage(key: string | undefined, messages: Record<string, string>) {
  return key ? messages[key] : undefined;
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { platformUser: actor } = await requirePlatformUser({
    roles: ["administrator"],
  });
  const [users, params] = await Promise.all([listPlatformUsers(), searchParams]);
  const notice = getMessage(params.notice, notices);
  const error = getMessage(params.error, errors);

  return (
    <main className={styles.shell} id="main-content">
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Administración</p>
          <h1>Cuentas y acceso</h1>
          <p>
            Invitá personas, reenviá accesos vencidos y desactivá cuentas sin borrar su
            historial.
          </p>
        </div>
        <Link className={styles.backLink} href="/">
          Volver al inicio
        </Link>
      </header>

      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

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
                label="Correo electrónico"
                name="email"
                required
                type="email"
              />
              <SelectField id="role" label="Rol" name="role" required>
                <option value="collaborator">Colaborador</option>
                <option value="supervisor">Supervisor</option>
                <option value="administrator">Administrador</option>
              </SelectField>
              <Button type="submit">Enviar invitación</Button>
            </form>
          </CardBody>
        </Card>

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
                            <input
                              name="platformUserId"
                              type="hidden"
                              value={user.id}
                            />
                            <Button size="small" type="submit" variant="secondary">
                              Reenviar
                            </Button>
                          </form>
                        )}
                        {user.status !== "deactivated" && user.id !== actor.id && (
                          <form action={deactivatePlatformUser}>
                            <input
                              name="platformUserId"
                              type="hidden"
                              value={user.id}
                            />
                            <Button size="small" type="submit" variant="danger">
                              Desactivar
                            </Button>
                          </form>
                        )}
                        {user.status === "deactivated" && (
                          <form action={reactivatePlatformUser}>
                            <input
                              name="platformUserId"
                              type="hidden"
                              value={user.id}
                            />
                            <Button size="small" type="submit" variant="secondary">
                              Reactivar
                            </Button>
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
      </div>
    </main>
  );
}
