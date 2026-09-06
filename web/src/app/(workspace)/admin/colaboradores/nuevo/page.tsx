import type { Metadata } from "next";
import { UserRoundPlus } from "lucide-react";

import { Container } from "@/components/ui/container/container";
import { PageSectionHeader } from "@/components/ui/page-section-header/page-section-header";
import { EmployeeCreationForm } from "@/features/employees/components/employee-creation-form";
import styles from "@/features/employees/components/employee-management.module.css";
import { getEmployeeCreationPageData } from "@/features/employees/server/employee-query-service";

export const metadata: Metadata = { title: "Nuevo colaborador" };

export default async function NewEmployeePage() {
  const { departments, managers } = await getEmployeeCreationPageData();

  return (
    <Container>
      <div className={styles.page}>
        <header className={styles.header}>
          <PageSectionHeader icon={UserRoundPlus} title="Nuevo colaborador" />
        </header>
        <EmployeeCreationForm departments={departments} managers={managers} />
      </div>
    </Container>
  );
}
