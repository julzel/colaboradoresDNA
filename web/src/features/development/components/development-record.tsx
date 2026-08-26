import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  MessageSquareText,
} from "lucide-react";

import { ButtonLink } from "@/components/ui/button/button";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { BackLink } from "@/components/ui/navigation/back-link";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import type { OneOnOneTimelineSummary } from "@/features/development/domain/one-on-one";
import type {
  DevelopmentEmployeeIdentity,
  DevelopmentRecordSummary,
} from "@/features/development/view-models/development-view";

import styles from "./development-record.module.css";

function formatDate(value: string | null) {
  if (!value) return "Sin registro";
  return new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function statusLabel(status: OneOnOneTimelineSummary["status"]) {
  if (status === "finalized") return "Finalizado";
  if (status === "draft") return "Borrador";
  return "Anulado";
}

export function DevelopmentRecord({
  currentSection = "overview",
  employee,
  oneOnOnes,
  summary,
  today,
}: {
  currentSection?: "one_on_one" | "overview";
  employee: DevelopmentEmployeeIdentity;
  oneOnOnes: OneOnOneTimelineSummary[];
  summary: DevelopmentRecordSummary;
  today: string;
}) {
  const baseHref = `/admin/colaboradores/${employee.id}/desarrollo`;
  const isActive = employee.employmentStatus === "active";
  const isOverdue = Boolean(
    summary.nextOneOnOneDueOn && summary.nextOneOnOneDueOn < today,
  );
  const attention = !summary.lastFinalizedOneOnOneOn
    ? {
        description: `Todavía no se registró un 1:1 para ${employee.displayName}.`,
        label: "Primer seguimiento pendiente",
      }
    : isOverdue
      ? {
          description: `El próximo seguimiento estaba previsto para ${formatDate(summary.nextOneOnOneDueOn)}.`,
          label: "Es momento de retomar la conversación",
        }
      : summary.overdueActionCount > 0
        ? {
            description: `${summary.overdueActionCount} acción(es) acordada(s) necesitan seguimiento.`,
            label: "Hay acuerdos por revisar",
          }
        : {
            description: `Próximo seguimiento previsto para ${formatDate(summary.nextOneOnOneDueOn)}.`,
            label: "Seguimiento al día",
          };

  return (
    <div className={styles.page}>
      <BackLink href="/admin/desarrollo">Volver a desarrollo</BackLink>
      <ElevatedSurface as="header" className={styles.hero}>
        <span aria-hidden="true" className={styles.avatar}>
          {employee.initials}
        </span>
        <div className={styles.identityText}>
          <div className={styles.eyebrowRow}>
            <p className="eyebrow">Desarrollo</p>
            {!isActive && (
              <StatusBadge tone="neutral">Inactivo · solo consulta</StatusBadge>
            )}
          </div>
          <h1>{employee.displayName}</h1>
          <p className={styles.heroDescription}>
            {employee.positionTitle ?? "Sin puesto asignado"} ·{" "}
            {employee.departmentName ?? "Sin departamento"}
          </p>
        </div>
        <div className={styles.heroActions}>
          {isActive && (
            <ButtonLink href={`${baseHref}/1-a-1/nueva`}>
              <CalendarPlus aria-hidden="true" size={18} />
              Registrar 1:1
            </ButtonLink>
          )}
          <ButtonLink
            href={`/admin/colaboradores/${employee.id}`}
            size="small"
            variant="quiet"
          >
            Ver perfil
          </ButtonLink>
        </div>
      </ElevatedSurface>

      <nav aria-label="Secciones de desarrollo" className={styles.sectionNav}>
        <Link
          aria-current={currentSection === "overview" ? "page" : undefined}
          href={baseHref}
        >
          Resumen
        </Link>
        <Link
          aria-current={currentSection === "one_on_one" ? "page" : undefined}
          href={`${baseHref}/1-a-1`}
        >
          Reuniones 1:1
        </Link>
      </nav>

      {!isActive && (
        <div className={styles.inactiveNote}>
          <strong>Colaborador inactivo</strong>
          <span>
            Este registro se conserva para consulta. No se pueden crear nuevos
            seguimientos.
          </span>
        </div>
      )}

      {currentSection === "overview" ? (
        <>
          <ElevatedSurface as="section" className={styles.attention}>
            <span className={styles.attentionIcon}>
              {isOverdue || !summary.lastFinalizedOneOnOneOn ? (
                <Clock3 aria-hidden="true" />
              ) : (
                <CheckCircle2 aria-hidden="true" />
              )}
            </span>
            <div>
              <p className="eyebrow">Siguiente paso</p>
              <h2>{attention.label}</h2>
              <p>{attention.description}</p>
            </div>
            {isActive && (
              <ButtonLink href={`${baseHref}/1-a-1/nueva`} size="small">
                {summary.lastFinalizedOneOnOneOn
                  ? "Registrar 1:1"
                  : "Registrar primer 1:1"}
              </ButtonLink>
            )}
          </ElevatedSurface>

          <section aria-label="Resumen de seguimiento" className={styles.summary}>
            <ElevatedSurface className={styles.summaryCard}>
              <CalendarClock aria-hidden="true" />
              <span>Cadencia</span>
              <strong>Cada {summary.oneOnOneCadenceDays ?? 30} días</strong>
            </ElevatedSurface>
            <ElevatedSurface className={styles.summaryCard}>
              <MessageSquareText aria-hidden="true" />
              <span>Último 1:1</span>
              <strong>{formatDate(summary.lastFinalizedOneOnOneOn)}</strong>
            </ElevatedSurface>
            <ElevatedSurface className={styles.summaryCard}>
              <CalendarPlus aria-hidden="true" />
              <span>Próximo 1:1</span>
              <strong>{formatDate(summary.nextOneOnOneDueOn)}</strong>
            </ElevatedSurface>
            <ElevatedSurface className={styles.summaryCard}>
              <CheckCircle2 aria-hidden="true" />
              <span>Acciones abiertas</span>
              <strong>{summary.openActionCount}</strong>
            </ElevatedSurface>
          </section>

          <TimelineSection baseHref={baseHref} items={oneOnOnes.slice(0, 4)} showAll />
        </>
      ) : (
        <TimelineSection baseHref={baseHref} items={oneOnOnes} />
      )}
    </div>
  );
}

function TimelineSection({
  baseHref,
  items,
  showAll = false,
}: {
  baseHref: string;
  items: OneOnOneTimelineSummary[];
  showAll?: boolean;
}) {
  return (
    <ElevatedSurface as="section" className={styles.timelineSection}>
      <div className={styles.sectionHeading}>
        <div>
          <p className="eyebrow">Historial</p>
          <h2>Reuniones 1:1</h2>
          <p>Conversaciones, acuerdos y borradores en un solo lugar.</p>
        </div>
        {showAll && items.length > 0 && (
          <ButtonLink href={`${baseHref}/1-a-1`} size="small" variant="quiet">
            Ver todas
            <ArrowRight aria-hidden="true" size={17} />
          </ButtonLink>
        )}
      </div>
      {items.length ? (
        <ol className={styles.timeline}>
          {items.map((meeting) => (
            <li key={meeting.id}>
              <Link
                className={styles.timelineItem}
                href={`${baseHref}/1-a-1/${meeting.id}`}
              >
                <span className={styles.timelineIcon}>
                  <MessageSquareText aria-hidden="true" size={18} />
                </span>
                <span className={styles.timelineText}>
                  <strong>{formatDate(meeting.occurredOn)}</strong>
                  <small>
                    {meeting.calendarEventId
                      ? "Vinculado con Calendario"
                      : meeting.status === "draft"
                        ? "Continuá cuando estés listo"
                        : "Registro de conversación"}
                  </small>
                </span>
                <StatusBadge
                  tone={
                    meeting.status === "finalized"
                      ? "success"
                      : meeting.status === "draft"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {statusLabel(meeting.status)}
                </StatusBadge>
                <ArrowRight
                  aria-hidden="true"
                  className={styles.timelineArrow}
                  size={18}
                />
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <div className={styles.empty}>
          <MessageSquareText aria-hidden="true" />
          <div>
            <h3>Todavía no hay reuniones 1:1</h3>
            <p className={styles.emptyDescription}>
              Registrá la primera conversación para comenzar un historial útil y
              accionable.
            </p>
          </div>
        </div>
      )}
    </ElevatedSurface>
  );
}
