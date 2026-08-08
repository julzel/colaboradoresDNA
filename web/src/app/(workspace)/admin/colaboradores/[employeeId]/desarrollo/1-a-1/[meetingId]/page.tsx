import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container/container";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { BackLink } from "@/components/ui/navigation/back-link";
import { OneOnOneDetail } from "@/features/development/components/one-on-one-detail";
import { OneOnOneForm } from "@/features/development/components/one-on-one-form";
import styles from "@/features/development/components/one-on-one.module.css";
import { DevelopmentDomainError } from "@/features/development/domain/shared";
import { getOneOnOneForAdministration } from "@/features/development/server/development-service";

export const metadata: Metadata = { title: "Detalle del 1:1" };

async function loadOneOnOne(employeeId: string, meetingId: string) {
  try {
    return await getOneOnOneForAdministration({ employeeId, meetingId });
  } catch (error) {
    if (
      error instanceof DevelopmentDomainError &&
      (error.code === "employee_not_found" || error.code === "record_not_found")
    ) {
      notFound();
    }
    throw error;
  }
}

export default async function OneOnOnePage({
  params,
}: {
  params: Promise<{ employeeId: string; meetingId: string }>;
}) {
  const { employeeId, meetingId } = await params;
  const detail = await loadOneOnOne(employeeId, meetingId);
  if (detail.meeting.status !== "draft") {
    return (
      <Container>
        <OneOnOneDetail {...detail} />
      </Container>
    );
  }
  const cancelHref = `/admin/colaboradores/${employeeId}/desarrollo/1-a-1`;
  return (
    <Container>
      <div className={styles.page}>
        <BackLink href={cancelHref}>Volver a reuniones 1:1</BackLink>
        <ElevatedSurface as="header" className={styles.pageHeader}>
          <div className={styles.identity}>
            <span aria-hidden="true" className={styles.identityAvatar}>
              {detail.employee.initials}
            </span>
            <div>
              <p className="eyebrow">Borrador</p>
              <h1>Continuar 1:1 con {detail.employee.displayName}</h1>
              <p>Guardado por última vez en la versión {detail.meeting.version}.</p>
            </div>
          </div>
        </ElevatedSurface>
        <OneOnOneForm
          cancelHref={cancelHref}
          employeeId={employeeId}
          employeeName={detail.employee.displayName}
          meeting={detail.meeting}
          today={detail.meeting.occurredOn}
        />
      </div>
    </Container>
  );
}
