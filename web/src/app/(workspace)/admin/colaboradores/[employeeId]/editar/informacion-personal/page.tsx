import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container/container";
import { BackLink } from "@/components/ui/navigation/back-link";
import { PersonalInformationForm } from "@/features/employees/components/personal-information-form";
import styles from "@/features/employees/components/employee-management.module.css";
import { getEmployeePersonalInformationPageData } from "@/features/employees/server/employee-query-service";

export const metadata: Metadata = { title: "Editar información personal" };

export default async function EditPersonalInformationPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  const employee = await getEmployeePersonalInformationPageData(employeeId);
  if (!employee) notFound();

  return (
    <Container>
      <div className={styles.page}>
        <BackLink href={`/admin/colaboradores/${employeeId}`}>
          Volver al detalle
        </BackLink>
        <header className={styles.header}>
          <div>
            <p className="eyebrow">Colaborador</p>
            <h1>Editar información personal</h1>
            <p>Los valores normalizados se calculan y validan en el servidor.</p>
          </div>
        </header>
        <PersonalInformationForm employee={employee} />
      </div>
    </Container>
  );
}
