import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container/container";
import { BackLink } from "@/components/ui/navigation/back-link";
import { PersonalInformationForm } from "@/features/employees/components/personal-information-form";
import styles from "@/features/employees/components/employee-management.module.css";
import { findEmployeeById } from "@/features/employees/server/employee-repository";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";

export const metadata: Metadata = { title: "Editar información personal" };

export default async function EditPersonalInformationPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  await requirePlatformUser({ roles: ["administrator"] });
  const { employeeId } = await params;
  const employee = await findEmployeeById(employeeId);
  if (!employee) notFound();

  return (
    <Container>
      <main className={styles.page} id="main-content">
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
        <PersonalInformationForm
          employee={{
            birthDay: employee.birthDay,
            birthMonth: employee.birthMonth,
            firstSurname: employee.firstSurname,
            givenNames: employee.givenNames,
            id: employee.id,
            identification: {
              type: employee.identification.type,
              value: employee.identification.value,
            },
            phoneDisplayValue: employee.phoneNumber?.displayValue ?? null,
            secondSurname: employee.secondSurname,
            shareBirthdayOnCalendar: employee.shareBirthdayOnCalendar,
          }}
        />
      </main>
    </Container>
  );
}
