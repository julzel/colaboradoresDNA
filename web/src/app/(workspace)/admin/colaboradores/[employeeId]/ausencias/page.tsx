import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ButtonLink } from "@/components/ui/button/button";
import { Container } from "@/components/ui/container/container";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import {
  PtoBalanceAdjustmentForm,
  PtoOpeningBalanceForm,
} from "@/features/pto/components/pto-balance-forms";
import styles from "@/features/pto/components/pto.module.css";
import { formatPtoDays } from "@/features/pto/domain/pto";
import { getEmployeePtoAdministration } from "@/features/pto/server/pto-service";

export const metadata: Metadata = { title: "Saldo de ausencias" };

const ledgerLabels = {
  adjustment: "Ajuste",
  approved_request: "Solicitud aprobada",
  opening: "Saldo inicial",
} as const;

export default async function EmployeePtoAdministrationPage({
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
          href={`/admin/colaboradores/${employeeId}`}
          size="small"
          variant="quiet"
        >
          ← Volver al colaborador
        </ButtonLink>
        <header className={styles.header}>
          <div>
            <p className="eyebrow">Administración</p>
            <h1>Saldo de ausencias</h1>
            <p>{detail.employeeName}</p>
          </div>
        </header>

        <div className={styles.twoColumns}>
          <ElevatedSurface as="section" className={styles.card}>
            <p className="eyebrow">Saldo actual</p>
            <p className={styles.metric}>
              {detail.balanceUnits === null
                ? "Sin configurar"
                : `${formatPtoDays(detail.balanceUnits)} días`}
            </p>
            {detail.balanceUnits === null ? (
              <PtoOpeningBalanceForm employeeId={employeeId} />
            ) : (
              <PtoBalanceAdjustmentForm
                currentBalanceUnits={detail.balanceUnits}
                employeeId={employeeId}
                employeeName={detail.employeeName}
              />
            )}
          </ElevatedSurface>

          <ElevatedSurface as="section" className={styles.card}>
            <h2>Historial del saldo</h2>
            {detail.ledger.length ? (
              <ol className={styles.ledger}>
                {detail.ledger.map((entry) => (
                  <li className={styles.ledgerItem} key={entry.id}>
                    <div>
                      <strong>{ledgerLabels[entry.kind]}</strong>
                      <p className={styles.muted}>
                        {entry.reason ?? "Sin motivo adicional"} · {entry.actorName} ·{" "}
                        {entry.createdAt.toLocaleString("es-CR")}
                      </p>
                    </div>
                    <strong>
                      {entry.deltaUnits > 0 ? "+" : ""}
                      {formatPtoDays(entry.deltaUnits)} días
                    </strong>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={styles.muted}>No hay movimientos registrados.</p>
            )}
          </ElevatedSurface>
        </div>
      </main>
    </Container>
  );
}
