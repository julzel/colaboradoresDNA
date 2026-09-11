import type { Metadata } from "next";
import { UsersRound } from "lucide-react";
import { Container } from "@/components/ui/container/container";
import { PageSectionHeader } from "@/components/ui/page-section-header/page-section-header";
import { EmployeeBulkImport } from "@/features/employees/components/employee-bulk-import";
import styles from "@/features/employees/components/employee-management.module.css";
import { getEmployeeImportOptions } from "@/features/employees/server/employee-import-service";

export const metadata: Metadata = { title: "Importar colaboradores" };

export default async function ImportEmployeesPage() {
  const departments = await getEmployeeImportOptions();
  return (
    <Container className={styles.fullWidthContainer}>
      <div className={styles.page}>
        <PageSectionHeader icon={UsersRound} title="Importar colaboradores" />
        <EmployeeBulkImport departments={departments} />
      </div>
    </Container>
  );
}
