import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container/container";
import { PageSectionHeader } from "@/components/ui/page-section-header/page-section-header";
import { AccessManagementForm } from "@/features/employees/components/access-management-form";
import styles from "@/features/employees/components/employee-management.module.css";
import { getEmployeeAccessPageData } from "@/features/employees/server/employee-query-service";

export const metadata: Metadata = { title: "Gestionar acceso" };

export default async function EditAccessPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  const detail = await getEmployeeAccessPageData(employeeId);
  if (!detail) notFound();

  return (
    <Container className={styles.fullWidthContainer}>
      <div className={styles.page}>
        <header className={styles.header}>
          <PageSectionHeader
            icon={ShieldCheck}
            title="Gestionar acceso y relación laboral"
          />
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
