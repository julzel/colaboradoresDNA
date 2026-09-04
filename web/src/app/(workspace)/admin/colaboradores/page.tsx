import type { Metadata } from "next";
import { UserRoundPlus, Users } from "lucide-react";

import { ButtonLink } from "@/components/ui/button/button";
import { Container } from "@/components/ui/container/container";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { PageSectionHeader } from "@/components/ui/page-section-header/page-section-header";
import { EmployeeDirectory } from "@/features/employees/components/employee-directory";
import { EmployeeDirectorySummary } from "@/features/employees/components/employee-directory-summary";
import styles from "@/features/employees/components/employee-management.module.css";
import { getEmployeeDirectoryPageData } from "@/features/employees/server/employee-query-service";

export const metadata: Metadata = { title: "Colaboradores" };

export default async function EmployeeDirectoryPage() {
  const directory = await getEmployeeDirectoryPageData();

  return (
    <Container>
      <div className={styles.page}>
        <header className={styles.header}>
          <PageSectionHeader
            action={
              <ButtonLink
                aria-label="Nuevo colaborador"
                className={styles.newEmployeeButton}
                href="/admin/colaboradores/nuevo"
                size="small"
                title="Nuevo colaborador"
              >
                <UserRoundPlus aria-hidden="true" size={18} />
                <span className={styles.newEmployeeButtonLabel}>Nuevo colaborador</span>
              </ButtonLink>
            }
            icon={Users}
            title="Colaboradores"
          />
        </header>

        <EmployeeDirectorySummary items={directory.items} />

        {directory.total === 0 ? (
          <ElevatedSurface as="section" className={styles.empty}>
            <h2>No hay colaboradores registrados</h2>
            <p className={styles.muted}>Creá el primer registro para comenzar.</p>
          </ElevatedSurface>
        ) : (
          <EmployeeDirectory items={directory.items} />
        )}
      </div>
    </Container>
  );
}
