import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container/container";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { BackLink } from "@/components/ui/navigation/back-link";
import { OneOnOneForm } from "@/features/development/components/one-on-one-form";
import styles from "@/features/development/components/one-on-one.module.css";
import { DevelopmentDomainError } from "@/features/development/domain/shared";
import { getOneOnOneFormContextForAdministration } from "@/features/development/server/development-service";

export const metadata: Metadata = { title: "Registrar 1:1" };

async function loadFormContext(employeeId: string) {
  try {
    return await getOneOnOneFormContextForAdministration(employeeId);
  } catch (error) {
    if (
      error instanceof DevelopmentDomainError &&
      error.code === "employee_not_found"
    ) {
      notFound();
    }
    throw error;
  }
}

export default async function NewOneOnOnePage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  const { employee, today } = await loadFormContext(employeeId);
  const cancelHref = `/admin/colaboradores/${employeeId}/desarrollo/1-a-1`;
  return (
    <Container>
      <div className={styles.page}>
        <BackLink href={cancelHref}>Volver a reuniones 1:1</BackLink>
        <ElevatedSurface as="header" className={styles.pageHeader}>
          <div className={styles.identity}>
            <span aria-hidden="true" className={styles.identityAvatar}>
              {employee.initials}
            </span>
            <div>
              <p className="eyebrow">Nuevo seguimiento</p>
              <h1>1:1 con {employee.displayName}</h1>
              <p>
                {employee.positionTitle ?? "Sin puesto"} ·{" "}
                {employee.departmentName ?? "Sin departamento"}
              </p>
            </div>
          </div>
        </ElevatedSurface>
        <OneOnOneForm
          cancelHref={cancelHref}
          employeeId={employeeId}
          employeeName={employee.displayName}
          today={today}
        />
      </div>
    </Container>
  );
}
