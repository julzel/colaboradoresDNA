import type { Metadata } from "next";
import Link from "next/link";
import {
  BriefcaseBusiness,
  CalendarClock,
  CalendarDays,
  ContactRound,
  KeyRound,
  LockKeyhole,
  UserRound,
} from "lucide-react";

import { ButtonLink } from "@/components/ui/button/button";
import { Container } from "@/components/ui/container/container";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { PageSectionHeader } from "@/components/ui/page-section-header/page-section-header";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { ProfileImageForm } from "@/features/employees/components/profile-image-form";
import { ScheduleSummary } from "@/features/employees/components/schedule-summary";
import { SelfServiceProfileForm } from "@/features/employees/components/self-service-profile-form";
import styles from "@/features/employees/components/self-service-profile.module.css";
import { getOwnEmployeeProfile } from "@/features/employees/server/employee-service";

export const metadata: Metadata = { title: "Mi perfil" };

const roleLabels = {
  administrator: "Administrador",
  collaborator: "Colaborador",
  supervisor: "Supervisor",
} as const;

const accessLabels = {
  active: "Acceso activo",
  deactivated: "Acceso desactivado",
  invited: "Invitación pendiente",
} as const;

const identificationLabels = {
  national_id: "Cédula",
  other: "Identificación",
  residence_id: "DIMEX",
} as const;

function optimizedClerkImageUrl(imageUrl: string) {
  try {
    const url = new URL(imageUrl);
    url.searchParams.set("width", "256");
    url.searchParams.set("height", "256");
    url.searchParams.set("fit", "crop");
    url.searchParams.set("quality", "85");
    return url.toString();
  } catch {
    return imageUrl;
  }
}

export default async function ProfilePage() {
  const profile = await getOwnEmployeeProfile();

  if (!profile) {
    return (
      <Container>
        <ElevatedSurface as="section" className={styles.missingState}>
          <p className="eyebrow">Mi perfil</p>
          <h1>Tu cuenta todavía no tiene un perfil vinculado</h1>
          <p>
            Una persona administradora debe vincular tu cuenta con el registro de
            colaborador antes de que puedas consultar esta información.
          </p>
          <ButtonLink href="/">Volver al inicio</ButtonLink>
        </ElevatedSurface>
      </Container>
    );
  }

  const imageUrl = optimizedClerkImageUrl(profile.image.url);

  return (
    <Container>
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <PageSectionHeader icon={UserRound} title="Mi perfil" />
        </header>

        <ElevatedSurface as="section" className={styles.hero}>
          <ProfileImageForm
            displayName={profile.employee.displayName}
            hasImage={profile.image.hasImage}
            imageUrl={imageUrl}
            initials={profile.employee.initials}
          />
          <div className={styles.heroContent}>
            <p className="eyebrow">Colaborador</p>
            <h2>{profile.employee.displayName}</h2>
            {profile.employee.preferredName && (
              <p className={styles.canonicalName}>
                Nombre registrado: {profile.employee.canonicalDisplayName}
              </p>
            )}
            <p className={styles.assignment}>
              {profile.currentAssignment?.positionTitle ?? "Sin puesto asignado"} ·{" "}
              {profile.currentAssignment?.departmentName ?? "Sin departamento"}
            </p>
            <div className={styles.statusRow}>
              <StatusBadge
                tone={
                  profile.employee.employmentStatus === "active" ? "success" : "neutral"
                }
              >
                {profile.employee.employmentStatus === "active"
                  ? "Laboral: activo"
                  : "Laboral: inactivo"}
              </StatusBadge>
              <StatusBadge
                tone={profile.access.status === "active" ? "success" : "warning"}
              >
                {accessLabels[profile.access.status]}
              </StatusBadge>
            </div>
          </div>
        </ElevatedSurface>

        <div className={styles.grid}>
          <ElevatedSurface as="section" className={`${styles.card} ${styles.wideCard}`}>
            <header className={styles.cardHeader}>
              <ContactRound aria-hidden="true" size={24} />
              <h2>Cómo quiero aparecer</h2>
            </header>
            <SelfServiceProfileForm
              canonicalDisplayName={profile.employee.canonicalDisplayName}
              phoneDisplayValue={profile.employee.phoneDisplayValue}
              preferredName={profile.employee.preferredName}
              shareBirthdayOnCalendar={profile.employee.shareBirthdayOnCalendar}
            />
          </ElevatedSurface>

          <ElevatedSurface as="section" className={styles.card}>
            <header className={styles.cardHeader}>
              <UserRound aria-hidden="true" size={24} />
              <h2>Información personal</h2>
            </header>
            <dl className={styles.detailList}>
              <div>
                <dt>Nombre registrado</dt>
                <dd>{profile.employee.canonicalDisplayName}</dd>
              </div>
              <div>
                <dt>Cumpleaños</dt>
                <dd>{profile.employee.birthday}</dd>
              </div>
              <div>
                <dt>{identificationLabels[profile.employee.identification.type]}</dt>
                <dd>{profile.employee.identification.maskedValue}</dd>
              </div>
            </dl>
          </ElevatedSurface>

          <ElevatedSurface as="section" className={styles.card}>
            <header className={styles.cardHeader}>
              <BriefcaseBusiness aria-hidden="true" size={24} />
              <h2>Información laboral</h2>
            </header>
            <dl className={styles.detailList}>
              <div>
                <dt>Departamento</dt>
                <dd>{profile.currentAssignment?.departmentName ?? "Sin asignar"}</dd>
              </div>
              <div>
                <dt>Puesto</dt>
                <dd>{profile.currentAssignment?.positionTitle ?? "Sin asignar"}</dd>
              </div>
              <div>
                <dt>Jefatura directa</dt>
                <dd>{profile.currentAssignment?.managerName ?? "Sin asignar"}</dd>
              </div>
              <div>
                <dt>Fecha de ingreso</dt>
                <dd>{profile.employee.employmentStartedOn}</dd>
              </div>
              <div>
                <dt>Fecha de salida</dt>
                <dd>{profile.employee.employmentEndedOn ?? "No aplica"}</dd>
              </div>
            </dl>
          </ElevatedSurface>

          <ElevatedSurface as="section" className={`${styles.card} ${styles.wideCard}`}>
            <header className={styles.cardHeader}>
              <CalendarDays aria-hidden="true" size={24} />
              <h2>Horario actual</h2>
            </header>
            <ScheduleSummary schedule={profile.currentSchedule} />
            <ButtonLink
              className={styles.scheduleLink}
              href="/perfil/horario"
              size="small"
              variant="secondary"
            >
              <CalendarClock aria-hidden="true" size={17} />
              Ver mi horario
            </ButtonLink>
          </ElevatedSurface>

          <ElevatedSurface as="section" className={`${styles.card} ${styles.wideCard}`}>
            <header className={styles.cardHeader}>
              <LockKeyhole aria-hidden="true" size={24} />
              <h2>Seguridad y acceso</h2>
            </header>
            <dl className={styles.detailList}>
              <div>
                <dt>Correo personal</dt>
                <dd>{profile.access.email}</dd>
              </div>
              <div>
                <dt>Rol de plataforma</dt>
                <dd>{roleLabels[profile.access.role]}</dd>
              </div>
              <div>
                <dt>Estado de acceso</dt>
                <dd>{accessLabels[profile.access.status]}</dd>
              </div>
            </dl>
            <Link className={styles.securityLink} href="/account/security">
              <KeyRound aria-hidden="true" size={18} /> Administrar seguridad de la
              cuenta
            </Link>
          </ElevatedSurface>
        </div>
      </div>
    </Container>
  );
}
