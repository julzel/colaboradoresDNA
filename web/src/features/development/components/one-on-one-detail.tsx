import { CalendarClock, Check, RotateCcw } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/button/button";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { BackLink } from "@/components/ui/navigation/back-link";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { updateOneOnOneActionStatusAction } from "@/features/development/actions/development-actions";
import type { OneOnOneDetail as OneOnOneDetailModel } from "@/features/development/domain/one-on-one";
import type { InternalOneOnOneCalendarEventSummary } from "@/features/calendar/view-models/calendar-event-view";
import type { DevelopmentEmployeeIdentity } from "@/features/development/view-models/development-view";
import {
  formatCalendarDate,
  formatCalendarTime,
  utcToCostaRicaDate,
} from "@/features/calendar/domain/calendar-utils";

import styles from "./one-on-one.module.css";

const ownerLabels = {
  employee: "Colaborador",
  organization: "Organización",
  shared: "Ambos",
} as const;

function formatDate(value: string) {
  return formatCalendarDate(value, true);
}

export function OneOnOneDetail({
  calendarEvent,
  employee,
  meeting,
}: {
  calendarEvent: InternalOneOnOneCalendarEventSummary | null;
  employee: DevelopmentEmployeeIdentity;
  meeting: OneOnOneDetailModel;
}) {
  const baseHref = `/admin/colaboradores/${employee.id}/desarrollo`;

  return (
    <div className={styles.page}>
      <BackLink href={`${baseHref}/1-a-1`}>Volver a reuniones 1:1</BackLink>
      <ElevatedSurface as="header" className={styles.detailHeader}>
        <div>
          <p className="eyebrow">1:1 con {employee.displayName}</p>
          <h1>{formatDate(meeting.occurredOn)}</h1>
          <div className={styles.detailMeta}>
            <StatusBadge tone={meeting.status === "finalized" ? "success" : "neutral"}>
              {meeting.status === "finalized" ? "Finalizado" : "Anulado"}
            </StatusBadge>
            <span>Versión {meeting.version}</span>
          </div>
        </div>
        <div className={styles.detailActions}>
          <ButtonLink href={baseHref} size="small" variant="quiet">
            Ver resumen
          </ButtonLink>
          {employee.employmentStatus === "active" && (
            <ButtonLink href={`${baseHref}/1-a-1/nueva`} size="small">
              Registrar otro 1:1
            </ButtonLink>
          )}
        </div>
      </ElevatedSurface>

      <div className={styles.detailGrid}>
        <div className={styles.detailColumn}>
          <ElevatedSurface as="section" className={styles.detailSection}>
            <h2>Resumen</h2>
            <p className={styles.summaryText}>
              {meeting.sharedSummary ?? "Este registro no incluye un resumen general."}
            </p>
          </ElevatedSurface>

          {meeting.discussionSections.length > 0 && (
            <ElevatedSurface as="section" className={styles.detailSection}>
              <h2>Temas conversados</h2>
              <ul className={styles.topicList}>
                {meeting.discussionSections.map((section) => (
                  <li className={styles.topicItem} key={section.heading}>
                    <h3>{section.heading}</h3>
                    <p className={styles.topicText}>{section.notes}</p>
                  </li>
                ))}
              </ul>
            </ElevatedSurface>
          )}

          <ElevatedSurface as="section" className={styles.detailSection}>
            <h2>Acciones acordadas</h2>
            {meeting.actions.length ? (
              <ul className={styles.actionList}>
                {meeting.actions.map((action) => (
                  <li
                    className={styles.actionItem}
                    data-completed={action.status === "completed" ? "true" : undefined}
                    key={action.id}
                  >
                    <span className={styles.actionCheck}>
                      {action.status === "completed" ? (
                        <Check aria-hidden="true" size={18} />
                      ) : (
                        <CalendarClock aria-hidden="true" size={18} />
                      )}
                    </span>
                    <div>
                      <strong>{action.description}</strong>
                      <div className={styles.actionFacts}>
                        <span>{ownerLabels[action.owner]}</span>
                        <span>
                          {action.dueOn
                            ? `Objetivo: ${formatDate(action.dueOn)}`
                            : "Sin fecha objetivo"}
                        </span>
                      </div>
                    </div>
                    {meeting.status === "finalized" && (
                      <form action={updateOneOnOneActionStatusAction}>
                        <input name="actionId" type="hidden" value={action.id} />
                        <input name="employeeId" type="hidden" value={employee.id} />
                        <input name="meetingId" type="hidden" value={meeting.id} />
                        <input name="version" type="hidden" value={meeting.version} />
                        <input
                          name="status"
                          type="hidden"
                          value={action.status === "completed" ? "open" : "completed"}
                        />
                        <Button size="small" type="submit" variant="secondary">
                          {action.status === "completed" ? (
                            <>
                              <RotateCcw aria-hidden="true" size={15} />
                              Reabrir
                            </>
                          ) : (
                            <>
                              <Check aria-hidden="true" size={15} />
                              Completar
                            </>
                          )}
                        </Button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.inlineEmpty}>
                No se registraron acciones para esta conversación.
              </p>
            )}
          </ElevatedSurface>
        </div>

        <div className={styles.detailColumn}>
          <ElevatedSurface
            as="section"
            className={`${styles.detailSection} ${styles.calendarCard}`}
          >
            <div className={styles.sectionHeading}>
              <span>
                <CalendarClock aria-hidden="true" size={16} />
              </span>
              <div>
                <h2>Calendario</h2>
                <p>La cita no contiene notas de desarrollo.</p>
              </div>
            </div>
            {calendarEvent ? (
              <>
                <strong>
                  {formatCalendarDate(
                    utcToCostaRicaDate(new Date(calendarEvent.startsAt)),
                    true,
                  )}
                </strong>
                <span>
                  {formatCalendarTime(calendarEvent.startsAt)} –{" "}
                  {formatCalendarTime(calendarEvent.endsAt)}
                </span>
                <ButtonLink
                  href={`/calendario/eventos/${calendarEvent.id}`}
                  size="small"
                  variant="secondary"
                >
                  Abrir evento
                </ButtonLink>
              </>
            ) : meeting.calendarEventId ? (
              <p>El evento vinculado ya no está disponible.</p>
            ) : (
              <p>Este 1:1 no fue agregado al calendario.</p>
            )}
          </ElevatedSurface>
        </div>
      </div>
    </div>
  );
}
