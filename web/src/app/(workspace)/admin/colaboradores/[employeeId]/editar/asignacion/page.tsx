import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container/container";
import { PageSectionHeader } from "@/components/ui/page-section-header/page-section-header";
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
    <Container className={styles.fullWidthContainer}>
      <div className={styles.page}>
        <header className={styles.header}>
          <PageSectionHeader icon={Building2} title="Cambiar asignación" />
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
