import {
  calculateWeeklySchedule,
  dayOfWeekOrder,
  type EmployeeSchedule,
} from "@/features/employees/domain/schedule";

import styles from "./employee-management.module.css";

const dayLabels = {
  friday: "Viernes",
  monday: "Lunes",
  saturday: "Sábado",
  sunday: "Domingo",
  thursday: "Jueves",
  tuesday: "Martes",
  wednesday: "Miércoles",
} as const;

type ScheduleSummaryProps = {
  schedule: EmployeeSchedule | null;
};

export function ScheduleSummary({ schedule }: ScheduleSummaryProps) {
  if (!schedule) return <p className={styles.muted}>Sin horario asignado.</p>;
  const totals = calculateWeeklySchedule(schedule.days);

  return (
    <>
      <dl className={styles.summary}>
        {dayOfWeekOrder.map((day) => {
          const scheduledDay = schedule.days.find((item) => item.dayOfWeek === day);
          const value =
            scheduledDay?.workFraction === 1
              ? "Día completo"
              : scheduledDay?.workFraction === 0.5
                ? `Medio día · ${
                    scheduledDay.halfDayPeriod === "morning" ? "Mañana" : "Tarde"
                  }`
                : "No trabaja";
          return (
            <div key={day}>
              <dt>{dayLabels[day]}</dt>
              <dd>{value}</dd>
            </div>
          );
        })}
      </dl>
      <p>
        <strong>{totals.weeklyScheduledDays} días</strong> ·{" "}
        {totals.weeklyScheduledHours} horas por semana
      </p>
    </>
  );
}
