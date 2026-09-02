import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container/container";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { BackLink } from "@/components/ui/navigation/back-link";
import { ScheduleEditor } from "@/features/scheduling/components/schedule-editor";
import { SchedulePreview } from "@/features/scheduling/components/scheduler-dashboard";
import styles from "@/features/scheduling/components/schedule-detail.module.css";
import { getSchedulerDetailPageData } from "@/features/scheduling/server/scheduler-query-service";

export const metadata: Metadata = { title: "Horario del colaborador" };

export default async function EmployeeSchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ employeeId: string }>;
  searchParams: Promise<{ fecha?: string; guardado?: string }>;
}) {
  const [{ employeeId }, query] = await Promise.all([params, searchParams]);
  const detail = await getSchedulerDetailPageData(employeeId, query.fecha);
  if (!detail) notFound();

  return (
    <Container>
      <div className={styles.page}>
        <BackLink href="/admin/horarios">Volver a horarios</BackLink>
        <header className={styles.header}>
          <div>
            <p className="eyebrow">Horario del colaborador</p>
            <div className={styles.title}>
              <span className={styles.titleIcon}>
                <CalendarClock aria-hidden="true" size={24} strokeWidth={1.8} />
              </span>
              <div>
                <h1>{detail.employee.displayName}</h1>
                <p>Configurá sus días y horas de trabajo.</p>
              </div>
            </div>
          </div>
          {query.guardado === "1" && (
            <div className={styles.savedNotice} role="status">
              Horario guardado correctamente.
            </div>
          )}
        </header>

        <ElevatedSurface as="section" className={styles.currentCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Horario consultado</h2>
              <p>Estado vigente para la fecha seleccionada.</p>
            </div>
          </div>
          {detail.current.status === "missing" ? (
            <div className={styles.currentEmpty}>
              <strong>Sin horario vigente</strong>
              <span>
                Guardá una jornada para comenzar a calcular sus días laborales.
              </span>
            </div>
          ) : (
            <SchedulePreview item={detail.current} />
          )}
        </ElevatedSurface>

        <div className={styles.layout}>
          <ElevatedSurface as="section" className={styles.editorCard}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Editar horario</h2>
                <p>Los cambios entran en vigencia en la fecha seleccionada.</p>
              </div>
            </div>
            <ScheduleEditor detail={detail} />
          </ElevatedSurface>

          <aside className={styles.sidebar}>
            <ElevatedSurface as="section" className={styles.sideCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2>Historial</h2>
                  <p>{detail.history.length} versiones registradas</p>
                </div>
              </div>
              {detail.history.length ? (
                <ol className={styles.historyList}>
                  {detail.history.map((item, index) => (
                    <li className={styles.historyItem} key={`${item.id}-${index}`}>
                      <strong>
                        {item.status === "alternating"
                          ? "Horario alternante"
                          : "Horario semanal"}
                      </strong>
                      <span>{item.effectiveLabel}</span>
                      <span>{item.scheduleSummary}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={styles.historyEmpty}>
                  Todavía no hay cambios registrados.
                </p>
              )}
            </ElevatedSurface>
          </aside>
        </div>
      </div>
    </Container>
  );
}
