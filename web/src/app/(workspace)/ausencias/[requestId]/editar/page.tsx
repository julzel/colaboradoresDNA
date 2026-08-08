import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container/container";
import { BackLink } from "@/components/ui/navigation/back-link";
import styles from "@/features/pto/components/pto.module.css";
import { PtoRequestForm } from "@/features/pto/components/pto-request-form";
import { getPtoRequestDetail } from "@/features/pto/server/pto-service";

export const metadata: Metadata = { title: "Editar solicitud de ausencia" };

export default async function EditPtoRequestPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const detail = await getPtoRequestDetail(requestId);
  if (!detail || !detail.canEdit) notFound();
  return (
    <Container>
      <main className={styles.page} id="main-content">
        <BackLink href={`/ausencias/${requestId}`}>Volver a la solicitud</BackLink>
        <header className={styles.header}>
          <div>
            <p className="eyebrow">Borrador</p>
            <h1>Editar solicitud</h1>
          </div>
        </header>
        <PtoRequestForm
          {...(detail.proxyEmployeeId ? { employeeId: detail.proxyEmployeeId } : {})}
          request={{
            category: detail.request.category,
            collaboratorNote: detail.request.collaboratorNote,
            durationUnits: detail.request.durationUnits,
            endDate: detail.request.endDate,
            id: detail.request.id,
            startDate: detail.request.startDate,
          }}
        />
      </main>
    </Container>
  );
}
