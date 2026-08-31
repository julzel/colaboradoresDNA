import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container/container";
import { BackLink } from "@/components/ui/navigation/back-link";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { PtoCategoryBadge } from "@/features/pto/components/pto-category-badge";
import { PtoRequestDetailContent } from "@/features/pto/components/pto-request-detail-content";
import styles from "@/features/pto/components/pto.module.css";
import { ptoStatusLabels } from "@/features/pto/domain/pto";
import { getPtoRequestDetail } from "@/features/pto/server/pto-service";

export const metadata: Metadata = { title: "Solicitud de ausencia" };

const statusTones = {
  approved: "success",
  cancelled: "neutral",
  denied: "danger",
  draft: "neutral",
  pending: "warning",
} as const;

export default async function PtoRequestDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const detail = await getPtoRequestDetail(requestId);
  if (!detail) notFound();
  const { request } = detail;
  return (
    <Container>
      <div className={styles.page}>
        <BackLink href="/ausencias">Volver a solicitudes</BackLink>
        <header className={styles.header}>
          <div>
            <h1>
              <PtoCategoryBadge category={request.category} size="large" />
            </h1>
          </div>
          <StatusBadge tone={statusTones[request.status]}>
            {ptoStatusLabels[request.status]}
          </StatusBadge>
        </header>

        <PtoRequestDetailContent detail={detail} />
      </div>
    </Container>
  );
}
