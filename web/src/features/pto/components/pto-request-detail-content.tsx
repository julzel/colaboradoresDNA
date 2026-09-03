import {
  Ban,
  CalendarDays,
  Check,
  ClipboardList,
  Clock3,
  FilePenLine,
  History,
  MessageSquareText,
  StickyNote,
  UserRound,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { ButtonLink } from "@/components/ui/button/button";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { PtoCategoryIcon } from "@/features/pto/components/pto-category-badge";
import {
  PtoCancelForm,
  PtoDecisionForm,
  PtoReassignmentForm,
  PtoSubmitForm,
} from "@/features/pto/components/pto-transition-forms";
import {
  formatPtoDateRange,
  formatPtoDays,
  ptoCategoryLabels,
  ptoStatusLabels,
  type PtoStatus,
} from "@/features/pto/domain/pto";
import type { PtoRequestDetailView } from "@/features/pto/view-models/pto-view";

import styles from "./pto.module.css";

type PtoRequestDetailContentProps = {
  detail: PtoRequestDetailView;
  presentation?: "modal" | "page";
};

const statusTones = {
  approved: "success",
  cancelled: "neutral",
  denied: "danger",
  draft: "neutral",
  pending: "warning",
} as const;

const historyStatusIcons: Record<PtoStatus, LucideIcon> = {
  approved: Check,
  cancelled: Ban,
  denied: X,
  draft: FilePenLine,
  pending: Clock3,
};

function DetailFact({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <dt>
        {/* <span className={styles.requestDetailFactIcon}>
          <Icon aria-hidden="true" size={16} />
        </span> */}
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <header className={styles.requestDetailSectionTitle}>
      <span>
        <Icon aria-hidden="true" size={18} />
      </span>
      <h2>{title}</h2>
    </header>
  );
}

function RequestHistory({ history }: Pick<PtoRequestDetailView, "history">) {
  const newestFirst = [...history].reverse();

  return (
    <ol className={styles.requestHistoryTimeline}>
      {newestFirst.map((entry, index) => {
        const Icon = historyStatusIcons[entry.to];
        const sequence = history.length - index;

        return (
          <li
            className={styles.requestHistoryTimelineItem}
            data-status={entry.to}
            key={`${entry.occurredAt.toISOString()}-${index}`}
          >
            <span className={styles.requestHistoryMarker}>
              <Icon aria-hidden="true" size={11} />
            </span>
            <span aria-label={`Paso ${sequence}`} className={styles.requestHistoryStep}>
              {sequence}
            </span>
            <div className={styles.requestHistoryEntry}>
              <div>
                <strong>{ptoStatusLabels[entry.to]}</strong>
                <span>{entry.actorName}</span>
              </div>
              <time dateTime={entry.occurredAt.toISOString()}>
                {entry.occurredAt.toLocaleString("es-CR")}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function PtoRequestDetailContent({
  detail,
  presentation = "page",
}: PtoRequestDetailContentProps) {
  const { request, warnings } = detail;

  return (
    <div className={styles.requestDetailContent} data-presentation={presentation}>
      {presentation === "modal" && (
        <ElevatedSurface
          aria-label="Resumen de la solicitud"
          as="section"
          className={styles.requestDetailSummary}
        >
          <div className={styles.requestDetailCategory}>
            <PtoCategoryIcon category={request.category} />
            <div>
              <span className={styles.requestDetailCategoryLabel}>
                Tipo de solicitud
              </span>
              <strong
                className={styles.requestDetailCategoryValue}
                data-category={request.category}
              >
                {ptoCategoryLabels[request.category]}
              </strong>
            </div>
          </div>
          <div className={styles.requestDetailStatus}>
            <span className={styles.requestDetailStatusLabel}>Estado</span>
            <StatusBadge
              className={styles.requestDetailStatusBadge}
              tone={statusTones[request.status]}
            >
              {ptoStatusLabels[request.status]}
            </StatusBadge>
          </div>
        </ElevatedSurface>
      )}

      {(warnings.hasOverlap || warnings.wouldBeNegative) && (
        <div className={styles.warning} role="status">
          <strong>Revisá estas advertencias:</strong>
          <ul>
            {warnings.hasOverlap && (
              <li>Esta solicitud coincide con otra ausencia pendiente o aprobada.</li>
            )}
            {warnings.wouldBeNegative && warnings.projectedBalanceUnits !== null && (
              <li>
                El saldo de vacaciones proyectado será de{" "}
                {formatPtoDays(warnings.projectedBalanceUnits)} días.
              </li>
            )}
          </ul>
          Estas advertencias no bloquean el envío ni la aprobación.
        </div>
      )}

      <div className={styles.detailGrid}>
        <ElevatedSurface
          as="section"
          className={[styles.card, styles.requestDetailCard].filter(Boolean).join(" ")}
        >
          <SectionTitle icon={ClipboardList} title="Detalle" />
          <dl className={styles.requestDetailFacts}>
            <DetailFact
              icon={CalendarDays}
              label="Fechas"
              value={formatPtoDateRange(request.startDate, request.endDate)}
            />
            <DetailFact
              icon={Clock3}
              label="Duración"
              value={`${formatPtoDays(request.durationUnits)} días`}
            />
            <DetailFact
              icon={UserRound}
              label="Persona aprobadora"
              value={request.approverName ?? "Se asignará al enviar"}
            />
            <DetailFact
              icon={StickyNote}
              label="Nota"
              value={request.collaboratorNote ?? "Sin nota"}
            />
            {request.decisionNote && (
              <DetailFact
                icon={MessageSquareText}
                label="Nota de decisión"
                value={request.decisionNote}
              />
            )}
            {request.balanceBeforeUnits !== null && (
              <DetailFact
                icon={WalletCards}
                label="Efecto en saldo de vacaciones"
                value={
                  <>
                    {formatPtoDays(request.balanceBeforeUnits)} →{" "}
                    {formatPtoDays(request.balanceAfterUnits ?? 0)} días
                  </>
                }
              />
            )}
          </dl>
          <div className={styles.actions}>
            {detail.canEdit && (
              <ButtonLink href={`/ausencias/${request.id}/editar`} variant="secondary">
                Editar borrador
              </ButtonLink>
            )}
            {detail.canCancel && <PtoCancelForm requestId={request.id} />}
          </div>
        </ElevatedSurface>

        <ElevatedSurface
          as="section"
          className={[styles.card, styles.requestDetailCard].filter(Boolean).join(" ")}
        >
          <SectionTitle icon={History} title="Historial" />
          <RequestHistory history={detail.history} />
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
  );
}
