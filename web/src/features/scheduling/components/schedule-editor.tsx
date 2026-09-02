"use client";

import { AlertTriangle, Copy, MousePointer2 } from "lucide-react";
import { useActionState, useMemo, useState, type MouseEvent } from "react";

import { Button } from "@/components/ui/button/button";
import { SubmitButton } from "@/components/ui/feedback/submit-button";
import { SelectField, TextField } from "@/components/ui/form-field/form-field";
import { saveEmployeeScheduleAction } from "@/features/scheduling/actions/scheduler-actions";
import { initialSchedulerActionState } from "@/features/scheduling/domain/scheduler-action-state";
import type {
  SchedulerDetailView,
  SchedulerEditorDayView,
} from "@/features/scheduling/view-models/scheduler-view";

import styles from "./schedule-detail.module.css";

type EditableDay = SchedulerEditorDayView;
type Cycle = "alternating" | "weekly";

const SLOT_MINUTES = 30;
const FIRST_AVAILABLE_MINUTE = 7 * 60;
const LAST_AVAILABLE_MINUTE = 17 * 60;
const SLOT_COUNT = (LAST_AVAILABLE_MINUTE - FIRST_AVAILABLE_MINUTE) / SLOT_MINUTES;

const timeSlots = Array.from({ length: SLOT_COUNT }, (_, index) => {
  const startMinutes = FIRST_AVAILABLE_MINUTE + index * SLOT_MINUTES;
  const endMinutes = startMinutes + SLOT_MINUTES;
  const format = (value: number) =>
    `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

  return { endTime: format(endMinutes), index, startTime: format(startMinutes) };
});

function minutes(value: string) {
  const [hours = 0, minute = 0] = value.split(":").map(Number);
  return hours * 60 + minute;
}

function slotIsSelected(day: EditableDay, slot: (typeof timeSlots)[number]) {
  if (!day.enabled || !day.startTime || !day.endTime) return false;
  return (
    minutes(slot.startTime) < minutes(day.endTime) &&
    minutes(slot.endTime) > minutes(day.startTime)
  );
}

function ScheduleGrid({
  anchors,
  onAnchorChange,
  onDayChange,
  week,
  weekIndex,
}: {
  anchors: Record<string, number | undefined>;
  onAnchorChange: (key: string, slot: number | undefined) => void;
  onDayChange: (dayIndex: number, patch: Partial<EditableDay>) => void;
  week: EditableDay[];
  weekIndex: number;
}) {
  function selectSlot(
    event: MouseEvent<HTMLButtonElement>,
    day: EditableDay,
    dayIndex: number,
    slotIndex: number,
  ) {
    const key = `${weekIndex}.${day.dayOfWeek}`;
    const currentAnchor = anchors[key];
    const slot = timeSlots[slotIndex]!;
    const selectedIndexes = timeSlots
      .filter((candidate) => slotIsSelected(day, candidate))
      .map((candidate) => candidate.index);
    const firstSelected = selectedIndexes[0];
    const lastSelected = selectedIndexes.at(-1);

    if (event.shiftKey && currentAnchor !== undefined) {
      const first = Math.min(currentAnchor, slotIndex);
      const last = Math.max(currentAnchor, slotIndex);
      onDayChange(dayIndex, {
        enabled: true,
        endTime: timeSlots[last]!.endTime,
        startTime: timeSlots[first]!.startTime,
      });
      onAnchorChange(key, undefined);
      return;
    }

    if (slotIsSelected(day, slot)) {
      if (firstSelected === lastSelected) {
        onDayChange(dayIndex, { enabled: false });
      } else if (slotIndex === firstSelected) {
        onDayChange(dayIndex, { startTime: slot.endTime });
      } else if (slotIndex === lastSelected) {
        onDayChange(dayIndex, { endTime: slot.startTime });
      }
      onAnchorChange(key, undefined);
      return;
    }

    if (firstSelected !== undefined && slotIndex === firstSelected - 1) {
      onDayChange(dayIndex, { startTime: slot.startTime });
      onAnchorChange(key, slotIndex);
      return;
    }

    if (lastSelected !== undefined && slotIndex === lastSelected + 1) {
      onDayChange(dayIndex, { endTime: slot.endTime });
      onAnchorChange(key, slotIndex);
      return;
    }

    onDayChange(dayIndex, {
      enabled: true,
      endTime: slot.endTime,
      startTime: slot.startTime,
    });
    onAnchorChange(key, slotIndex);
  }

  return (
    <div className={styles.gridScroller}>
      <div className={styles.scheduleGrid} role="grid">
        <div className={styles.gridCorner} role="columnheader">
          Día
        </div>
        {timeSlots.map((slot) => (
          <div className={styles.timeHeader} key={slot.startTime} role="columnheader">
            {slot.startTime}
          </div>
        ))}

        {week.map((day, dayIndex) => {
          const anchorKey = `${weekIndex}.${day.dayOfWeek}`;
          return (
            <div className={styles.gridRow} key={day.dayOfWeek} role="row">
              <label className={styles.gridDay}>
                <input
                  checked={day.enabled}
                  name={`week${weekIndex}.${day.dayOfWeek}.enabled`}
                  onChange={(event) => {
                    onAnchorChange(anchorKey, undefined);
                    onDayChange(dayIndex, { enabled: event.target.checked });
                  }}
                  type="checkbox"
                />
                <span>{day.dayLabel}</span>
                <small>
                  {day.enabled && day.startTime && day.endTime
                    ? `${day.startTime}–${day.endTime}`
                    : "Libre"}
                </small>
              </label>
              {timeSlots.map((slot) => {
                const selected = slotIsSelected(day, slot);
                return (
                  <button
                    aria-label={`${day.dayLabel}, ${slot.startTime} a ${slot.endTime}`}
                    aria-selected={selected}
                    className={styles.timeCell}
                    data-anchor={anchors[anchorKey] === slot.index}
                    data-selected={selected}
                    key={slot.startTime}
                    onClick={(event) => selectSlot(event, day, dayIndex, slot.index)}
                    role="gridcell"
                    type="button"
                  />
                );
              })}
              {day.enabled && (
                <>
                  <input
                    name={`week${weekIndex}.${day.dayOfWeek}.startTime`}
                    type="hidden"
                    value={day.startTime}
                  />
                  <input
                    name={`week${weekIndex}.${day.dayOfWeek}.endTime`}
                    type="hidden"
                    value={day.endTime}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ScheduleEditor({ detail }: { detail: SchedulerDetailView }) {
  const [state, action] = useActionState(
    saveEmployeeScheduleAction,
    initialSchedulerActionState,
  );
  const [cycle, setCycle] = useState<Cycle>(detail.editor.cycle);
  const [anchors, setAnchors] = useState<Record<string, number | undefined>>({});
  const [weeks, setWeeks] = useState<EditableDay[][]>(() =>
    detail.editor.weeks.map((week) => week.map((day) => ({ ...day }))),
  );

  const totals = useMemo(
    () =>
      weeks.slice(0, cycle === "weekly" ? 1 : 2).map((week) => ({
        days: week.filter((day) => day.enabled).length,
        hours: week.reduce(
          (total, day) =>
            total +
            (day.enabled && day.startTime && day.endTime
              ? Math.max(0, minutes(day.endTime) - minutes(day.startTime)) / 60
              : 0),
          0,
        ),
      })),
    [cycle, weeks],
  );

  function updateDay(weekIndex: number, dayIndex: number, patch: Partial<EditableDay>) {
    setWeeks((current) =>
      current.map((week, currentWeek) =>
        currentWeek === weekIndex
          ? week.map((day, currentDay) =>
              currentDay === dayIndex ? { ...day, ...patch } : day,
            )
          : week,
      ),
    );
  }

  function copyWeekA() {
    setWeeks((current) => [
      current[0]!.map((day) => ({ ...day })),
      current[0]!.map((day) => ({ ...day })),
    ]);
    setAnchors({});
  }

  return (
    <form action={action} className={styles.editorForm}>
      <input name="employeeId" type="hidden" value={detail.employee.id} />
      {state.status === "error" && (
        <div className={styles.formError} role="alert">
          <AlertTriangle aria-hidden="true" size={18} />
          <span>{state.message}</span>
        </div>
      )}
      {detail.editor.hasLegacyTimes && (
        <div className={styles.legacyNotice}>
          <AlertTriangle aria-hidden="true" size={18} />
          <p>
            El horario anterior no guardaba horas exactas. Seleccionalas en la
            cuadrícula para migrar esta jornada al formato actual.
          </p>
        </div>
      )}

      <div className={styles.settingsGrid}>
        <TextField
          defaultValue={detail.editor.effectiveFrom}
          error={state.errors?.effectiveFrom}
          id="schedule-effective-from"
          label="Vigente desde"
          name="effectiveFrom"
          required
          type="date"
        />
        <SelectField
          id="schedule-cycle"
          label="Tipo de horario"
          name="cycle"
          onChange={(event) =>
            setCycle(event.target.value === "alternating" ? "alternating" : "weekly")
          }
          value={cycle}
        >
          <option value="weekly">Se repite cada semana</option>
          <option value="alternating">Alterna cada dos semanas</option>
        </SelectField>
        {cycle === "alternating" && (
          <TextField
            defaultValue={detail.editor.anchorDate}
            error={state.errors?.anchorDate}
            id="schedule-anchor-date"
            label="Lunes de inicio de la semana A"
            name="anchorDate"
            required
            type="date"
          />
        )}
      </div>

      <div className={styles.gridInstructions}>
        <MousePointer2 aria-hidden="true" size={18} />
        <p>
          Hacé clic o tocá celdas contiguas para activarlas o desactivarlas. Para
          seleccionar un rango completo, elegí la hora inicial y luego la hora final
          manteniendo Shift.
        </p>
      </div>

      {weeks.slice(0, cycle === "weekly" ? 1 : 2).map((week, weekIndex) => (
        <fieldset className={styles.weekEditor} key={weekIndex}>
          <div className={styles.weekEditorHeader}>
            <div>
              <legend>
                {cycle === "weekly"
                  ? "Semana laboral"
                  : `Semana ${weekIndex ? "B" : "A"}`}
              </legend>
              <span>
                {totals[weekIndex]?.days ?? 0} días · {totals[weekIndex]?.hours ?? 0}{" "}
                horas
              </span>
            </div>
            {cycle === "alternating" && weekIndex === 1 && (
              <Button onClick={copyWeekA} size="small" variant="quiet">
                <Copy aria-hidden="true" size={15} />
                Copiar semana A
              </Button>
            )}
          </div>
          <ScheduleGrid
            anchors={anchors}
            onAnchorChange={(key, slot) =>
              setAnchors((current) => ({ ...current, [key]: slot }))
            }
            onDayChange={(dayIndex, patch) => updateDay(weekIndex, dayIndex, patch)}
            week={week}
            weekIndex={weekIndex}
          />
        </fieldset>
      ))}

      <div className={styles.formActions}>
        <SubmitButton pendingLabel="Guardando horario…">Guardar horario</SubmitButton>
        <span>El cambio conservará el historial anterior.</span>
      </div>
    </form>
  );
}
