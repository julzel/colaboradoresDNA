import { CalendarCheck2, Info } from "lucide-react";

import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import type { OwnScheduleView } from "@/features/scheduling/view-models/scheduler-view";

import styles from "./own-schedule.module.css";

export function OwnSchedule({ schedule }: { schedule: OwnScheduleView }) {
  if (schedule.status === "missing") {
    return (
      <div className={styles.empty}>
        <CalendarCheck2 aria-hidden="true" size={28} strokeWidth={1.7} />
        <div>
          <h2>Sin horario vigente</h2>
          <p>
            Todavía no tenés una jornada configurada para la fecha actual. Consultá con
            una persona administradora si necesitás confirmar tu horario.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.content}>
      <div className={styles.summary}>
        <div>
          <span className={styles.summaryLabel}>Jornada vigente</span>
          <strong>{schedule.scheduleSummary}</strong>
          <span className={styles.effectiveLabel}>{schedule.effectiveLabel}</span>
        </div>
        <StatusBadge tone="success">
          {schedule.status === "alternating" ? "Horario alternante" : "Horario semanal"}
        </StatusBadge>
      </div>

      <div className={styles.weeks}>
        {schedule.weeks.map((week, weekIndex) => {
          const isActive = schedule.activeWeekIndex === weekIndex;

          return (
            <section
              aria-current={isActive ? "true" : undefined}
              className={styles.week}
              data-active={isActive}
              key={week.label}
            >
              <header className={styles.weekHeader}>
                <div>
                  <h2>{week.label}</h2>
                  <p>
                    {isActive ? "Esta es tu semana actual" : "La otra semana del ciclo"}
                  </p>
                </div>
                {isActive && <span className={styles.currentBadge}>Actual</span>}
              </header>

              <ol className={styles.dayList}>
                {week.days.map((day) => (
                  <li
                    className={styles.day}
                    data-working={day.isWorkingDay}
                    key={day.dayLabel}
                  >
                    <strong>{day.dayLabel}</strong>
                    <span>{day.hoursLabel ?? "Libre"}</span>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>

      <div className={styles.readOnlyNote}>
        <Info aria-hidden="true" size={18} />
        <p>
          Este horario es de solo lectura. Una persona administradora debe realizar
          cualquier cambio.
        </p>
      </div>
    </div>
  );
}
