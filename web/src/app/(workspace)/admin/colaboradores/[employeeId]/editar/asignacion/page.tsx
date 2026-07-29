import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ButtonLink } from "@/components/ui/button/button";
import { Container } from "@/components/ui/container/container";
import { AssignmentForm } from "@/features/employees/components/assignment-form";
import styles from "@/features/employees/components/employee-management.module.css";
import { listDepartments } from "@/features/employees/server/department-repository";
import {
  getEmployeeDetailForAdministration,
  listEligibleManagerOptions,
} from "@/features/employees/server/employee-read-repository";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";

export const metadata: Metadata = { title: "Cambiar asignación" };

export default async function EditAssignmentPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  await requirePlatformUser({ roles: ["administrator"] });
  const { employeeId } = await params;
  const [detail, departments, managers] = await Promise.all([
    getEmployeeDetailForAdministration(employeeId),
    listDepartments(),
    listEligibleManagerOptions(employeeId),
  ]);
  if (!detail) notFound();

  return (
    <Container>
      <main className={styles.page} id="main-content">
        <ButtonLink
          href={`/admin/colaboradores/${employeeId}`}
          size="small"
          variant="quiet"
        >
          ← Volver al detalle
        </ButtonLink>
        <header className={styles.header}>
          <div>
            <p className="eyebrow">Colaborador</p>
            <h1>Cambiar asignación</h1>
            <p>La asignación anterior se conservará en el historial.</p>
          </div>
        </header>
        <AssignmentForm
          current={detail.currentAssignment}
          departments={departments}
          employeeId={employeeId}
          managers={managers}
        />
      </main>
    </Container>
  );
}
