import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container/container";
import { BackLink } from "@/components/ui/navigation/back-link";
import styles from "@/features/pto/components/pto.module.css";
import { PtoRequestForm } from "@/features/pto/components/pto-request-form";
import { getEmployeePtoAdministration } from "@/features/pto/server/pto-service";

export const metadata: Metadata = { title: "Nueva solicitud de ausencia" };

export default async function NewEmployeePtoRequestPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  const detail = await getEmployeePtoAdministration(employeeId);
  if (!detail) notFound();

  return (
    <Container>
      <div className={styles.page}>
        <BackLink href={`/admin/colaboradores/${employeeId}/ausencias`}>
          Volver al saldo de ausencias
        </BackLink>
        <header className={styles.header}>
          <div>
            <p className="eyebrow">Administración</p>
            <h1>Nueva solicitud</h1>
          </div>
        </header>
        <PtoRequestForm employeeId={employeeId} />
      </div>
    </Container>
  );
}
