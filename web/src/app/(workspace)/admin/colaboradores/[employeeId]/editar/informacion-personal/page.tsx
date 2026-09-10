import type { Metadata } from "next";
import { UserRoundPen } from "lucide-react";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container/container";
import { PageSectionHeader } from "@/components/ui/page-section-header/page-section-header";
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
    <Container className={styles.fullWidthContainer}>
      <div className={styles.page}>
        <header className={styles.header}>
          <PageSectionHeader icon={UserRoundPen} title="Editar información personal" />
        </header>
        <PersonalInformationForm employee={employee} />
      </div>
    </Container>
  );
}
