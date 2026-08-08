/* eslint-disable @next/next/no-img-element */

import { clerkClient } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Badge,
  Building,
  CalendarCheck2,
  CalendarClock,
  CalendarX2,
  Cake,
  Clock3,
  History,
  IdCard,
  KeyRound,
  Mail,
  MessageCircle,
  PenLine,
  Phone,
  ShieldCheck,
  UserCheck,
  UserRound,
  UsersRound,
  Umbrella,
} from "lucide-react";

import { ButtonLink } from "@/components/ui/button/button";
import { Container } from "@/components/ui/container/container";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { SubmitButton } from "@/components/ui/feedback/submit-button";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { resendEmployeeInvitation } from "@/features/employees/actions/employee-actions";
import { EmployeeDetailCard } from "@/features/employees/components/employee-detail-card";
import { EmployeeDetailItem } from "@/features/employees/components/employee-detail-item";
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

async function getProfileImageUrl(clerkUserId: string | null) {
  if (!clerkUserId) return null;

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(clerkUserId);
    return user.hasImage ? user.imageUrl : null;
  } catch {
    // The collaborator detail remains available with its initials fallback.
    return null;
  }
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  await requirePlatformUser({ roles: ["administrator"] });
  const { employeeId } = await params;
  const detail = await getEmployeeDetailForAdministration(employeeId);
  if (!detail) notFound();
  const profileImageUrl = await getProfileImageUrl(detail.access.clerkUserId);
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
        <ElevatedSurface
          as="header"
          className={`${styles.section} ${styles.detailHeader}`}
        >
          <span aria-hidden="true" className={styles.avatar}>
            {profileImageUrl ? (
              <img alt="" src={profileImageUrl} />
            ) : (
              detail.employee.initials
            )}
          </span>
          <div>
            <p className={`eyebrow ${styles.detailEyebrow}`}>Colaborador</p>
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
        </ElevatedSurface>

        <div className={styles.detailGrid}>
          <EmployeeDetailCard
            action={
              <ButtonLink
                href={`/admin/colaboradores/${employeeId}/ausencias`}
                size="small"
                variant="quiet"
              >
                Administrar
              </ButtonLink>
            }
            icon={Umbrella}
            title="Saldo de ausencias"
          >
            <p className={styles.muted}>
              Consultá el saldo, registrá la apertura o aplicá un ajuste auditable.
            </p>
          </EmployeeDetailCard>

          <EmployeeDetailCard
            action={
              <ButtonLink
                href={`/admin/colaboradores/${employeeId}/editar/informacion-personal`}
                size="small"
                variant="quiet"
              >
                <PenLine aria-hidden="true" size={18} /> Editar
              </ButtonLink>
            }
            icon={UserRound}
            title="Información personal"
          >
            <dl className={styles.detailItemGrid}>
              <EmployeeDetailItem icon={Cake} label="Cumpleaños">
                {detail.employee.birthday}
              </EmployeeDetailItem>
              <EmployeeDetailItem icon={CalendarCheck2} label="Mostrar">
                {detail.employee.shareBirthdayOnCalendar ? "Sí" : "No"}
              </EmployeeDetailItem>
              <EmployeeDetailItem icon={Phone} label="Teléfono">
                {detail.employee.phoneDisplayValue ?? "No indicado"}
              </EmployeeDetailItem>
              {detail.employee.preferredName && (
                <EmployeeDetailItem icon={MessageCircle} label="Nombre preferido">
                  {detail.employee.preferredName}
                </EmployeeDetailItem>
              )}
              <EmployeeDetailItem
                icon={IdCard}
                label={identificationLabels[detail.employee.identification.type]}
              >
                <IdentificationReveal
                  employeeId={employeeId}
                  maskedValue={detail.employee.identification.maskedValue}
                />
              </EmployeeDetailItem>
            </dl>
          </EmployeeDetailCard>

          <EmployeeDetailCard icon={Building} title="Información laboral">
            <dl className={styles.detailItemGrid}>
              <EmployeeDetailItem icon={CalendarClock} label="Fecha de ingreso">
                {detail.employee.employmentStartedOn}
              </EmployeeDetailItem>
              <EmployeeDetailItem icon={CalendarX2} label="Fecha de salida">
                {detail.employee.employmentEndedOn ?? "No aplica"}
              </EmployeeDetailItem>
            </dl>
          </EmployeeDetailCard>

          <EmployeeDetailCard
            action={
              detail.employee.employmentStatus === "active" ? (
                <ButtonLink
                  href={`/admin/colaboradores/${employeeId}/editar/asignacion`}
                  size="small"
                  variant="quiet"
                >
                  <PenLine aria-hidden="true" size={18} /> Editar
                </ButtonLink>
              ) : undefined
            }
            icon={UsersRound}
            title="Asignación actual"
          >
            <dl className={styles.detailItemGrid}>
              <EmployeeDetailItem icon={Building} label="Departamento">
                {detail.currentAssignment?.departmentName ?? "Sin asignar"}
              </EmployeeDetailItem>
              <EmployeeDetailItem icon={Badge} label="Puesto">
                {detail.currentAssignment?.positionTitle ?? "Sin asignar"}
              </EmployeeDetailItem>
              <EmployeeDetailItem icon={UserCheck} label="Jefatura directa">
                {detail.currentAssignment?.managerName ?? "Sin asignar"}
              </EmployeeDetailItem>
            </dl>
          </EmployeeDetailCard>

          <EmployeeDetailCard
            action={
              detail.employee.employmentStatus === "active" ? (
                <ButtonLink
                  href={`/admin/colaboradores/${employeeId}/editar/horario`}
                  size="small"
                  variant="quiet"
                >
                  <PenLine aria-hidden="true" size={18} /> Editar
                </ButtonLink>
              ) : undefined
            }
            icon={Clock3}
            title="Horario actual"
          >
            <ScheduleSummary schedule={detail.currentSchedule} />
          </EmployeeDetailCard>

          <EmployeeDetailCard
            action={
              <ButtonLink
                href={`/admin/colaboradores/${employeeId}/editar/acceso`}
                size="small"
                variant="quiet"
              >
                <PenLine aria-hidden="true" size={18} /> Editar
              </ButtonLink>
            }
            icon={ShieldCheck}
            title="Acceso a la plataforma"
          >
            <dl className={styles.detailItemGrid}>
              <EmployeeDetailItem icon={Mail} label="Correo personal">
                {detail.access.email}
              </EmployeeDetailItem>
              <EmployeeDetailItem icon={KeyRound} label="Rol">
                {roleLabels[detail.access.role]}
              </EmployeeDetailItem>
            </dl>
            {detail.access.status === "invited" && (
              <form action={resendEmployeeInvitation}>
                <input name="employeeId" type="hidden" value={employeeId} />
                <SubmitButton pendingLabel="Reenviando…" variant="secondary">
                  Reenviar invitación
                </SubmitButton>
              </form>
            )}
          </EmployeeDetailCard>
        </div>

        <EmployeeDetailCard icon={History} title="Historial de asignaciones">
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
        </EmployeeDetailCard>
      </main>
    </Container>
  );
}
