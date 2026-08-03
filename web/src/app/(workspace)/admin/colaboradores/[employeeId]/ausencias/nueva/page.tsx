import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ButtonLink } from "@/components/ui/button/button";
import { Container } from "@/components/ui/container/container";
import styles from "@/features/pto/components/pto.module.css";
import { PtoRequestForm } from "@/features/pto/components/pto-request-form";
import { formatPtoDays } from "@/features/pto/domain/pto";
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
      <main className={styles.page} id="main-content">
        <ButtonLink
          href={`/admin/colaboradores/${employeeId}/ausencias`}
          size="small"
          variant="quiet"
        >
          ← Volver al saldo de ausencias
        </ButtonLink>
        <header className={styles.header}>
          <div>
            <p className="eyebrow">Administración</p>
            <h1>Nueva solicitud</h1>
            <p>
              {detail.employeeName} · Saldo actual:{" "}
              {detail.balanceUnits === null
                ? "Sin configurar"
                : `${formatPtoDays(detail.balanceUnits)} días`}
            </p>
          </div>
        </header>
        <PtoRequestForm employeeId={employeeId} />
      </main>
    </Container>
  );
}
