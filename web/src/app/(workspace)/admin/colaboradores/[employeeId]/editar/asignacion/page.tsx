import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container/container";
import { BackLink } from "@/components/ui/navigation/back-link";
import { AssignmentForm } from "@/features/employees/components/assignment-form";
import styles from "@/features/employees/components/employee-management.module.css";
import { getEmployeeAssignmentPageData } from "@/features/employees/server/employee-query-service";

export const metadata: Metadata = { title: "Cambiar asignación" };

export default async function EditAssignmentPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  const { departments, detail, managers } =
    await getEmployeeAssignmentPageData(employeeId);
  if (!detail) notFound();

  return (
    <Container>
      <div className={styles.page}>
        <BackLink href={`/admin/colaboradores/${employeeId}`}>
          Volver al detalle
        </BackLink>
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
      </div>
    </Container>
  );
}
