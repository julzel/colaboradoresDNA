import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/button/button";
import { Container } from "@/components/ui/container/container";
import { EmployeeCreationForm } from "@/features/employees/components/employee-creation-form";
import styles from "@/features/employees/components/employee-management.module.css";
import { listDepartments } from "@/features/employees/server/department-repository";
import { listEligibleManagerOptions } from "@/features/employees/server/employee-read-repository";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";

export const metadata: Metadata = { title: "Nuevo colaborador" };

export default async function NewEmployeePage() {
  await requirePlatformUser({ roles: ["administrator"] });
  const [departments, managers] = await Promise.all([
    listDepartments(),
    listEligibleManagerOptions(),
  ]);

  return (
    <Container>
      <main className={styles.page} id="main-content">
        <ButtonLink href="/admin/colaboradores" size="small" variant="quiet">
          ← Volver a colaboradores
        </ButtonLink>
        <header className={styles.header}>
          <div>
            <p className="eyebrow">Administración</p>
            <h1>Nuevo colaborador</h1>
            <p>Creá el perfil, la asignación, el horario y la invitación.</p>
          </div>
        </header>
        <EmployeeCreationForm departments={departments} managers={managers} />
      </main>
    </Container>
  );
}
