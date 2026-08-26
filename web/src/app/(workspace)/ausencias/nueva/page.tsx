import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container/container";
import { BackLink } from "@/components/ui/navigation/back-link";
import styles from "@/features/pto/components/pto.module.css";
import { PtoRequestForm } from "@/features/pto/components/pto-request-form";
import { getPtoDashboard } from "@/features/pto/server/pto-service";

export const metadata: Metadata = { title: "Nueva solicitud de ausencia" };

export default async function NewPtoRequestPage() {
  const dashboard = await getPtoDashboard();
  if (!dashboard.canRequest) notFound();
  return (
    <Container>
      <div className={styles.page}>
        <BackLink href="/ausencias">Volver a solicitudes</BackLink>
        <header className={styles.header}>
          <div>
            <h1>Nueva solicitud</h1>
          </div>
        </header>
        <PtoRequestForm />
      </div>
    </Container>
  );
}
