import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/button/button";
import { Container } from "@/components/ui/container/container";
import styles from "@/features/pto/components/pto.module.css";
import { PtoRequestForm } from "@/features/pto/components/pto-request-form";
import { getPtoDashboard } from "@/features/pto/server/pto-service";

export const metadata: Metadata = { title: "Nueva solicitud de ausencia" };

export default async function NewPtoRequestPage() {
  const dashboard = await getPtoDashboard();
  return (
    <Container>
      <main className={styles.page} id="main-content">
        <ButtonLink href="/ausencias" size="small" variant="quiet">
          ← Volver a solicitudes
        </ButtonLink>
        <header className={styles.header}>
          <div>
            <p className="eyebrow">Solicitudes de ausencia</p>
            <h1>Nueva solicitud</h1>
            <p>
              Saldo actual:{" "}
              {dashboard.balanceUnits === null
                ? "sin configurar"
                : `${formatBalance(dashboard.balanceUnits)} días`}
              .
            </p>
          </div>
        </header>
        <PtoRequestForm />
      </main>
    </Container>
  );
}

function formatBalance(units: number) {
  return new Intl.NumberFormat("es-CR", { maximumFractionDigits: 1 }).format(units / 2);
}
