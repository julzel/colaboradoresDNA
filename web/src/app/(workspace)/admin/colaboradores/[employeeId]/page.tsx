import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ButtonLink } from "@/components/ui/button/button";
import { Container } from "@/components/ui/container/container";
import { SubmitButton } from "@/components/ui/feedback/submit-button";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { resendEmployeeInvitation } from "@/features/employees/actions/employee-actions";
import { IdentificationReveal } from "@/features/employees/components/identification-reveal";
import { ScheduleSummary } from "@/features/employees/components/schedule-summary";
import styles from "@/features/employees/components/employee-management.module.css";
import { getEmployeeDetailForAdministration } from "@/features/employees/server/employee-read-repository";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";

export const metadata: Metadata = { title: "Detalle del colaborador" };

const identificationLabels = {
  national_id: "Cédula",
  other: "Otro",
  residence_id: "DIMEX",
} as const;

const roleLabels = {
  administrator: "Administrador",
  collaborator: "Colaborador",
  supervisor: "Supervisor",
} as const;

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  await requirePlatformUser({ roles: ["administrator"] });
  const { employeeId } = await params;
  const detail = await getEmployeeDetailForAdministration(employeeId);
  if (!detail) notFound();
  const displayName = [
    detail.employee.givenNames,
    detail.employee.firstSurname,
    detail.employee.secondSurname,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Container>
      <main className={styles.page} id="main-content">
        <ButtonLink href="/admin/colaboradores" size="small" variant="quiet">
          ← Volver a colaboradores
        </ButtonLink>
        <header className={`${styles.section} ${styles.detailHeader}`}>
          <span aria-hidden="true" className={styles.avatar}>
            {detail.employee.initials}
          </span>
          <div>
            <p className="eyebrow">Colaborador</p>
            <h1>{displayName}</h1>
            <p className={styles.muted}>
              {detail.currentAssignment?.positionTitle ?? "Sin puesto asignado"} ·{" "}
              {detail.currentAssignment?.departmentName ?? "Sin departamento"}
            </p>
            <div className={styles.statusRow}>
              <StatusBadge
                tone={
                  detail.employee.employmentStatus === "active" ? "success" : "neutral"
                }
              >
                {detail.employee.employmentStatus === "active"
                  ? "Laboral: activo"
                  : "Laboral: inactivo"}
              </StatusBadge>
              <StatusBadge
                tone={
                  detail.access.status === "active"
                    ? "success"
                    : detail.access.status === "invited"
                      ? "warning"
                      : "danger"
                }
              >
                {detail.access.status === "active"
                  ? "Acceso activo"
                  : detail.access.status === "invited"
                    ? "Invitado"
                    : "Acceso desactivado"}
              </StatusBadge>
            </div>
          </div>
          <ButtonLink
            href={`/admin/colaboradores/${employeeId}/editar/informacion-personal`}
            variant="secondary"
          >
            Editar información
          </ButtonLink>
        </header>

        <div className={styles.detailGrid}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Información personal</h2>
              <ButtonLink
                href={`/admin/colaboradores/${employeeId}/editar/informacion-personal`}
                size="small"
                variant="quiet"
              >
                Editar
              </ButtonLink>
            </div>
            <dl className={styles.summary}>
              <div>
                <dt>Fecha de cumpleaños</dt>
                <dd>{detail.employee.birthday}</dd>
              </div>
              <div>
                <dt>Visible en calendario</dt>
                <dd>{detail.employee.shareBirthdayOnCalendar ? "Sí" : "No"}</dd>
              </div>
              <div>
                <dt>Teléfono</dt>
                <dd>{detail.employee.phoneDisplayValue ?? "No indicado"}</dd>
              </div>
              <div>
                <dt>{identificationLabels[detail.employee.identification.type]}</dt>
                <dd>
                  <IdentificationReveal
                    employeeId={employeeId}
                    maskedValue={detail.employee.identification.maskedValue}
                  />
                </dd>
              </div>
            </dl>
          </section>

          <section className={styles.section}>
            <h2>Información laboral</h2>
            <dl className={styles.summary}>
              <div>
                <dt>Fecha de ingreso</dt>
                <dd>{detail.employee.employmentStartedOn}</dd>
              </div>
              <div>
                <dt>Fecha de salida</dt>
                <dd>{detail.employee.employmentEndedOn ?? "No aplica"}</dd>
              </div>
            </dl>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Asignación actual</h2>
              {detail.employee.employmentStatus === "active" && (
                <ButtonLink
                  href={`/admin/colaboradores/${employeeId}/editar/asignacion`}
                  size="small"
                  variant="quiet"
                >
                  Cambiar
                </ButtonLink>
              )}
            </div>
            <dl className={styles.summary}>
              <div>
                <dt>Departamento</dt>
                <dd>{detail.currentAssignment?.departmentName ?? "Sin asignar"}</dd>
              </div>
              <div>
                <dt>Puesto</dt>
                <dd>{detail.currentAssignment?.positionTitle ?? "Sin asignar"}</dd>
              </div>
              <div>
                <dt>Jefatura directa</dt>
                <dd>{detail.currentAssignment?.managerName ?? "Sin asignar"}</dd>
              </div>
            </dl>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Horario actual</h2>
              {detail.employee.employmentStatus === "active" && (
                <ButtonLink
                  href={`/admin/colaboradores/${employeeId}/editar/horario`}
                  size="small"
                  variant="quiet"
                >
                  Cambiar
                </ButtonLink>
              )}
            </div>
            <ScheduleSummary schedule={detail.currentSchedule} />
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Acceso a la plataforma</h2>
              <ButtonLink
                href={`/admin/colaboradores/${employeeId}/editar/acceso`}
                size="small"
                variant="quiet"
              >
                Gestionar
              </ButtonLink>
            </div>
            <dl className={styles.summary}>
              <div>
                <dt>Correo personal</dt>
                <dd>{detail.access.email}</dd>
              </div>
              <div>
                <dt>Rol</dt>
                <dd>{roleLabels[detail.access.role]}</dd>
              </div>
            </dl>
            {detail.access.status === "invited" && (
              <form action={resendEmployeeInvitation}>
                <input name="employeeId" type="hidden" value={employeeId} />
                <SubmitButton pendingLabel="Reenviando…" variant="secondary">
                  Reenviar invitación
                </SubmitButton>
              </form>
            )}
          </section>
        </div>

        <section className={styles.section}>
          <h2>Historial de asignaciones</h2>
          {detail.assignmentHistory.length ? (
            <ol className={styles.historyList}>
              {detail.assignmentHistory.map((assignment) => (
                <li className={styles.historyItem} key={assignment.id}>
                  <strong>{assignment.positionTitle}</strong> ·{" "}
                  {assignment.departmentName}
                  <br />
                  <span className={styles.muted}>
                    {assignment.effectiveFrom} a{" "}
                    {assignment.effectiveTo ?? "la actualidad"} · Jefatura:{" "}
                    {assignment.managerName ?? "Sin asignar"}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className={styles.muted}>Sin historial de asignaciones.</p>
          )}
        </section>

        <section className={styles.section}>
          <h2>Historial de horarios</h2>
          {detail.scheduleHistory.length ? (
            <ol className={styles.historyList}>
              {detail.scheduleHistory.map((schedule) => (
                <li className={styles.historyItem} key={schedule.id}>
                  <strong>
                    Vigente desde {schedule.effectiveFrom} hasta{" "}
                    {schedule.effectiveTo ?? "la actualidad"}
                  </strong>
                  <ScheduleSummary schedule={schedule} />
                </li>
              ))}
            </ol>
          ) : (
            <p className={styles.muted}>Sin historial de horarios.</p>
          )}
        </section>
      </main>
    </Container>
  );
}
