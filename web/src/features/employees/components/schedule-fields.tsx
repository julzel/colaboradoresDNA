"use client";

import { useMemo, useState, type ChangeEvent } from "react";

import { SelectField } from "@/components/ui/form-field/form-field";
import {
  calculateWeeklySchedule,
  dayOfWeekOrder,
  type ScheduledDay,
  type WorkFraction,
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

type ScheduleFieldsProps = {
  initialDays: ScheduledDay[];
};

export function ScheduleFields({ initialDays }: ScheduleFieldsProps) {
  const [days, setDays] = useState(initialDays);
  const totals = useMemo(() => calculateWeeklySchedule(days), [days]);

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const day = event.currentTarget.dataset.day;
    const field = event.currentTarget.dataset.field;
    if (!day || !field) return;

    setDays((current) =>
      current.map((item) => {
        if (item.dayOfWeek !== day) return item;
        if (field === "workFraction") {
          const workFraction = Number(event.currentTarget.value) as WorkFraction;
          return {
            ...item,
            halfDayPeriod:
              workFraction === 0.5 ? (item.halfDayPeriod ?? "morning") : null,
            workFraction,
          };
        }
        return {
          ...item,
          halfDayPeriod:
            event.currentTarget.value === "afternoon" ? "afternoon" : "morning",
        };
      }),
    );
  }

  return (
    <>
      <div className={styles.scheduleGrid}>
        {dayOfWeekOrder.map((dayOfWeek) => {
          const day = days.find((item) => item.dayOfWeek === dayOfWeek);
          if (!day) return null;
          return (
            <section className={styles.scheduleDay} key={dayOfWeek}>
              <h3>{dayLabels[dayOfWeek]}</h3>
              <SelectField
                data-day={dayOfWeek}
                data-field="workFraction"
                id={`${dayOfWeek}-workFraction`}
                label="Jornada"
                name={`${dayOfWeek}.workFraction`}
                onChange={handleChange}
                value={day.workFraction}
              >
                <option value="1">Día completo</option>
                <option value="0.5">Medio día</option>
                <option value="0">No trabaja</option>
              </SelectField>
              <SelectField
                data-day={dayOfWeek}
                data-field="halfDayPeriod"
                disabled={day.workFraction !== 0.5}
                id={`${dayOfWeek}-halfDayPeriod`}
                label="Período"
                name={`${dayOfWeek}.halfDayPeriod`}
                onChange={handleChange}
                value={day.halfDayPeriod ?? ""}
              >
                <option value="">No aplica</option>
                <option value="morning">Mañana</option>
                <option value="afternoon">Tarde</option>
              </SelectField>
            </section>
          );
        })}
      </div>
      <p aria-live="polite">
        Total: <strong>{totals.weeklyScheduledDays} días</strong> ·{" "}
        <strong>{totals.weeklyScheduledHours} horas</strong> por semana
      </p>
    </>
  );
}
