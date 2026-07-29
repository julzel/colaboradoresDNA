import { Clock3 } from "lucide-react";

import {
  calculateWeeklySchedule,
  dayOfWeekOrder,
  type EmployeeSchedule,
} from "@/features/employees/domain/schedule";

import styles from "./employee-management.module.css";
const dayLabels = {
  friday: "Vie",
  monday: "Lun",
  saturday: "Sáb",
  sunday: "Dom",
  thursday: "Jue",
  tuesday: "Mar",
  wednesday: "Mié",
} as const;

type ScheduleSummaryProps = {
  schedule: EmployeeSchedule | null;
};

export function ScheduleSummary({ schedule }: ScheduleSummaryProps) {
  if (!schedule) return <p className={styles.muted}>Sin horario asignado.</p>;
  const totals = calculateWeeklySchedule(schedule.days);

  return (
    <>
      <dl className={styles.scheduleSummaryGrid}>
        {dayOfWeekOrder.map((day) => {
          const scheduledDay = schedule.days.find((item) => item.dayOfWeek === day);
          const isNotWorking = scheduledDay?.workFraction === 0;
          const value = isNotWorking
            ? "No trabaja"
            : scheduledDay?.workFraction === 0.5
              ? `Medio día · ${
                  scheduledDay.halfDayPeriod === "morning" ? "Mañana" : "Tarde"
                }`
              : "Día completo";
          return (
            <div className={styles.scheduleSummaryItem} key={day}>
              <dt>{dayLabels[day]}</dt>
              <dd className={isNotWorking ? styles.notWorking : styles.workingDay}>
                {!isNotWorking && (
                  <span aria-hidden="true" className={styles.statusDot} />
                )}
                {value}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className={styles.scheduleTotals}>
        <Clock3 aria-hidden="true" size={22} strokeWidth={2} />
        <strong>{totals.weeklyScheduledDays} días</strong> ·{" "}
        {totals.weeklyScheduledHours} horas por semana
      </p>
    </>
  );
}
