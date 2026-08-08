import type { Metadata } from "next";
import { UserRoundPlus, Users } from "lucide-react";

import { ButtonLink } from "@/components/ui/button/button";
import { Container } from "@/components/ui/container/container";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { EmployeeDirectory } from "@/features/employees/components/employee-directory";
import styles from "@/features/employees/components/employee-management.module.css";
import { parseEmployeeDirectoryQuery } from "@/features/employees/domain/employee-directory-query";
import { listEmployeeDirectoryForAdministration } from "@/features/employees/server/employee-read-repository";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";

export const metadata: Metadata = { title: "Colaboradores" };

export default async function EmployeeDirectoryPage() {
  await requirePlatformUser({ roles: ["administrator"] });
  const directory = await listEmployeeDirectoryForAdministration(
    parseEmployeeDirectoryQuery({}),
    { paginate: false },
  );

  return (
    <Container>
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <p className="eyebrow">Administración</p>
            <div className={styles.moduleTitle}>
              <span className={styles.moduleIcon}>
                <Users aria-hidden="true" size={24} strokeWidth={1.8} />
              </span>
              <h1>Colaboradores</h1>
              <ButtonLink
                aria-label="Nuevo colaborador"
                className={styles.newEmployeeButton}
                href="/admin/colaboradores/nuevo"
                size="small"
                title="Nuevo colaborador"
              >
                <UserRoundPlus aria-hidden="true" size={18} />
              </ButtonLink>
            </div>
          </div>
        </header>

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
