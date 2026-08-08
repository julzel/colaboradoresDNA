import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ButtonLink } from "@/components/ui/button/button";
import { Container } from "@/components/ui/container/container";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { BackLink } from "@/components/ui/navigation/back-link";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import styles from "@/features/pto/components/pto.module.css";
import {
  PtoCancelForm,
  PtoDecisionForm,
  PtoReassignmentForm,
  PtoSubmitForm,
} from "@/features/pto/components/pto-transition-forms";
import {
  formatPtoDays,
  ptoCategoryLabels,
  ptoStatusLabels,
} from "@/features/pto/domain/pto";
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
  const { request, warnings } = detail;
  return (
    <Container>
      <div className={styles.page}>
        <BackLink href="/ausencias">Volver a solicitudes</BackLink>
        <header className={styles.header}>
          <div>
            <p className="eyebrow">Solicitud de {request.requesterName}</p>
            <h1>{ptoCategoryLabels[request.category]}</h1>
            <p>
              {request.startDate} a {request.endDate}
            </p>
            {request.createdByName && (
              <p className={styles.muted}>
                Solicitud creada por {request.createdByName} en nombre del colaborador.
              </p>
            )}
          </div>
          <StatusBadge tone={statusTones[request.status]}>
            {ptoStatusLabels[request.status]}
          </StatusBadge>
        </header>

        {(warnings.hasOverlap || warnings.wouldBeNegative) && (
          <div className={styles.warning} role="status">
            <strong>Revisá estas advertencias:</strong>
            <ul>
              {warnings.hasOverlap && (
                <li>Esta solicitud coincide con otra ausencia pendiente o aprobada.</li>
              )}
              {warnings.wouldBeNegative && warnings.projectedBalanceUnits !== null && (
                <li>
                  El saldo proyectado será de{" "}
                  {formatPtoDays(warnings.projectedBalanceUnits)} días.
                </li>
              )}
            </ul>
            Estas advertencias no bloquean el envío ni la aprobación.
          </div>
        )}

        <div className={styles.detailGrid}>
          <ElevatedSurface as="section" className={styles.card}>
            <h2>Detalle</h2>
            <dl className={styles.definitionList}>
              <div>
                <dt>Duración</dt>
                <dd>{formatPtoDays(request.durationUnits)} días</dd>
              </div>
              <div>
                <dt>Persona aprobadora</dt>
                <dd>{request.approverName ?? "Se asignará al enviar"}</dd>
              </div>
              <div>
                <dt>Nota</dt>
                <dd>{request.collaboratorNote ?? "Sin nota"}</dd>
              </div>
              {request.decisionNote && (
                <div>
                  <dt>Nota de decisión</dt>
                  <dd>{request.decisionNote}</dd>
                </div>
              )}
              {request.balanceBeforeUnits !== null && (
                <div>
                  <dt>Efecto en saldo</dt>
                  <dd>
                    {formatPtoDays(request.balanceBeforeUnits)} →{" "}
                    {formatPtoDays(request.balanceAfterUnits ?? 0)} días
                  </dd>
                </div>
              )}
            </dl>
            <div className={styles.actions}>
              {detail.canEdit && (
                <ButtonLink
                  href={`/ausencias/${request.id}/editar`}
                  variant="secondary"
                >
                  Editar borrador
                </ButtonLink>
              )}
              {detail.canCancel && <PtoCancelForm requestId={request.id} />}
            </div>
          </ElevatedSurface>

          <ElevatedSurface as="section" className={styles.card}>
            <h2>Historial</h2>
            <ol className={styles.history}>
              {detail.history.map((entry, index) => (
                <li key={`${entry.occurredAt.toISOString()}-${index}`}>
                  {ptoStatusLabels[entry.to]} · {entry.actorName} ·{" "}
                  {entry.occurredAt.toLocaleString("es-CR")}
                </li>
              ))}
            </ol>
          </ElevatedSurface>
        </div>

        {detail.canSubmit && (
          <ElevatedSurface as="section" className={styles.card}>
            <h2>Enviar a aprobación</h2>
            <p className={styles.muted}>
              Colaboradores se envían a su supervisor. Las demás solicitudes quedan
              disponibles para administración.
            </p>
            <PtoSubmitForm requestId={request.id} />
          </ElevatedSurface>
        )}
        {detail.canDecide && (
          <ElevatedSurface as="section" className={styles.card}>
            <h2>Decisión</h2>
            <PtoDecisionForm requestId={request.id} />
          </ElevatedSurface>
        )}
        {detail.canReassign && (
          <ElevatedSurface as="section" className={styles.card}>
            <h2>Reasignar aprobación</h2>
            <p className={styles.warning}>
              La cuenta asignada ya no está activa. Solo podés reasignar a una persona
              elegible para esta solicitud.
            </p>
            <PtoReassignmentForm
              options={detail.reassignmentOptions}
              requestId={request.id}
            />
          </ElevatedSurface>
        )}
      </div>
    </Container>
  );
}
