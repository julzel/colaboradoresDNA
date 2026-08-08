import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container/container";
import { BackLink } from "@/components/ui/navigation/back-link";
import { AccessManagementForm } from "@/features/employees/components/access-management-form";
import styles from "@/features/employees/components/employee-management.module.css";
import { getEmployeeDetailForAdministration } from "@/features/employees/server/employee-read-repository";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";

export const metadata: Metadata = { title: "Gestionar acceso" };

export default async function EditAccessPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  await requirePlatformUser({ roles: ["administrator"] });
  const { employeeId } = await params;
  const detail = await getEmployeeDetailForAdministration(employeeId);
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
            <h1>Gestionar acceso y relación laboral</h1>
            <p>El acceso y el estado laboral se administran por separado.</p>
          </div>
        </header>
        <AccessManagementForm
          accessStatus={detail.access.status}
          email={detail.access.email}
          employeeId={employeeId}
          employmentActive={detail.employee.employmentStatus === "active"}
          role={detail.access.role}
        />
      </div>
    </Container>
  );
}
