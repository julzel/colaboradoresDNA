import type { Metadata } from "next";

import { Container } from "@/components/ui/container/container";
import { BackLink } from "@/components/ui/navigation/back-link";
import { EmployeeCreationForm } from "@/features/employees/components/employee-creation-form";
import styles from "@/features/employees/components/employee-management.module.css";
import { getEmployeeCreationPageData } from "@/features/employees/server/employee-query-service";

export const metadata: Metadata = { title: "Nuevo colaborador" };

export default async function NewEmployeePage() {
  const { departments, managers } = await getEmployeeCreationPageData();

  return (
    <Container>
      <div className={styles.page}>
        <BackLink href="/admin/colaboradores">Volver a colaboradores</BackLink>
        <header className={styles.header}>
          <div>
            <h1>Nuevo colaborador</h1>
          </div>
        </header>
        <EmployeeCreationForm departments={departments} managers={managers} />
      </div>
    </Container>
  );
}
