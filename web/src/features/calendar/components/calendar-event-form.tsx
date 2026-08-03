"use client";

import { useActionState, useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button/button";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { SubmitButton } from "@/components/ui/feedback/submit-button";
import {
  CheckboxField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/ui/form-field/form-field";
import {
  createCalendarEventAction,
  updateCalendarEventAction,
} from "@/features/calendar/actions/calendar-event-actions";
import { initialCalendarActionState } from "@/features/calendar/domain/calendar-action-state";
import {
  calendarEventTypeOptions,
  type CalendarEvent,
} from "@/features/calendar/domain/calendar-event";
import { getTodayInCostaRica } from "@/features/calendar/domain/calendar-utils";
import type { CalendarEventTargetOptions } from "@/features/calendar/server/calendar-event-repository";
import { useGuardedForm } from "@/features/employees/components/use-guarded-form";

import { CalendarFormErrorSummary } from "./calendar-form-error-summary";
import styles from "./calendar.module.css";

type CalendarEventFormProps = {
  cancelBehavior?: "back" | "callback" | "push";
  cancelHref: string;
  event?: CalendarEvent;
  mode: "create" | "edit";
  onCancel?: () => void;
  options: CalendarEventTargetOptions;
  presentation?: "modal" | "page";
};

export function CalendarEventForm({
  cancelBehavior = "push",
  cancelHref,
  event,
  mode,
  onCancel,
  options,
  presentation = "page",
}: CalendarEventFormProps) {
  const action =
    mode === "create" ? createCalendarEventAction : updateCalendarEventAction;
  const [state, formAction] = useActionState(action, initialCalendarActionState);
  const [allDay, setAllDay] = useState(event?.allDay ?? true);
  const [visibility, setVisibility] = useState(event?.visibility ?? "company");
  const { dirty, formRef, handleCancel, handleChange, handleSubmit } = useGuardedForm(
    cancelHref,
    cancelBehavior,
    onCancel,
  );
  const today = getTodayInCostaRica();
  const selectedInvitees = new Set(event?.inviteePlatformUserIds ?? []);

  function handleAllDayChange(changeEvent: ChangeEvent<HTMLInputElement>) {
    setAllDay(changeEvent.currentTarget.checked);
  }

  function handleVisibilityChange(changeEvent: ChangeEvent<HTMLSelectElement>) {
    const nextVisibility = changeEvent.currentTarget.value;
    if (
      nextVisibility === "company" ||
      nextVisibility === "department" ||
      nextVisibility === "invited"
    ) {
      setVisibility(nextVisibility);
    }
  }

  return (
    <ElevatedSurface
      action={formAction}
      as="form"
      className={styles.eventForm}
      data-presentation={presentation}
      data-unsaved-changes={dirty ? "true" : undefined}
      onChange={handleChange}
      onSubmit={handleSubmit}
      ref={formRef}
    >
      {event && <input name="eventId" type="hidden" value={event.id} />}
      <CalendarFormErrorSummary state={state} />

      <fieldset className={styles.formSection}>
        <legend>Información del evento</legend>
        <div className={styles.formGrid}>
          <SelectField
            defaultValue={event?.eventType ?? "custom"}
            error={state.errors?.eventType}
            id="eventType"
            label="Tipo de evento"
            name="eventType"
            required
          >
            {calendarEventTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <div className={styles.fullWidth}>
            <TextField
              defaultValue={event?.title ?? ""}
              error={state.errors?.title}
              id="title"
              label="Título"
              maxLength={120}
              name="title"
              required
            />
          </div>
          <div className={styles.fullWidth}>
            <TextAreaField
              defaultValue={event?.description ?? ""}
              error={state.errors?.description}
              id="description"
              label="Descripción"
              maxLength={2000}
              name="description"
              optional
              rows={4}
            />
          </div>
          <TextField
            defaultValue={event?.location ?? ""}
            error={state.errors?.location}
            id="location"
            label="Lugar"
            maxLength={200}
            name="location"
            optional
          />
          <TextField
            defaultValue={event?.meetingUrl ?? ""}
            error={state.errors?.meetingUrl}
            id="meetingUrl"
            label="Enlace de reunión"
            maxLength={500}
            name="meetingUrl"
            optional
            placeholder="https://"
            type="url"
          />
        </div>
      </fieldset>

      <fieldset className={styles.formSection}>
        <legend>Fecha y hora</legend>
        <CheckboxField
          checked={allDay}
          description="El evento no mostrará una hora específica."
          id="allDay"
          label="Evento de todo el día"
          name="allDay"
          onChange={handleAllDayChange}
        />
        <div className={styles.formGrid} hidden={!allDay}>
          <TextField
            defaultValue={event?.allDay ? event.startLocal : today}
            disabled={!allDay}
            error={state.errors?.startDate}
            id="startDate"
            label="Fecha inicial"
            name="startDate"
            required={allDay}
            type="date"
          />
          <TextField
            defaultValue={event?.allDay ? event.endLocal : today}
            disabled={!allDay}
            error={state.errors?.endDate}
            id="endDate"
            label="Fecha final"
            name="endDate"
            required={allDay}
            type="date"
          />
        </div>
        <div className={styles.formGrid} hidden={allDay}>
          <TextField
            defaultValue={event && !event.allDay ? event.startLocal : `${today}T09:00`}
            disabled={allDay}
            error={state.errors?.startDateTime}
            id="startDateTime"
            label="Inicio"
            name="startDateTime"
            required={!allDay}
            type="datetime-local"
          />
          <TextField
            defaultValue={event && !event.allDay ? event.endLocal : `${today}T10:00`}
            disabled={allDay}
            error={state.errors?.endDateTime}
            id="endDateTime"
            label="Final"
            name="endDateTime"
            required={!allDay}
            type="datetime-local"
          />
        </div>
        <p className={styles.formHint}>
          Las horas se interpretan en la zona horaria de Costa Rica.
        </p>
      </fieldset>

      <fieldset className={styles.formSection}>
        <legend>Visibilidad</legend>
        <SelectField
          error={state.errors?.visibility}
          id="visibility"
          label="¿Quién puede verlo?"
          name="visibility"
          onChange={handleVisibilityChange}
          value={visibility}
        >
          <option value="company">Toda la empresa</option>
          <option value="department">Un departamento</option>
          <option value="invited">Personas invitadas</option>
        </SelectField>

        <div hidden={visibility !== "department"}>
          <SelectField
            defaultValue={event?.departmentId ?? ""}
            disabled={visibility !== "department"}
            error={state.errors?.departmentId}
            id="departmentId"
            label="Departamento"
            name="departmentId"
            required={visibility === "department"}
          >
            <option value="">Seleccioná un departamento</option>
            {options.departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </SelectField>
        </div>

        <fieldset className={styles.peopleFieldset}>
          <legend>Personas agregadas</legend>
          <p className={styles.formHint}>
            Las personas seleccionadas verán el evento en su calendario y recibirán una
            notificación en Inicio.
            {visibility === "invited" && " Seleccioná al menos una persona."}
          </p>
          <div className={styles.peopleGrid}>
            {options.people.map((person) => (
              <CheckboxField
                defaultChecked={selectedInvitees.has(person.id)}
                id={`invitee-${person.id}`}
                key={person.id}
                label={person.displayName}
                name="inviteePlatformUserIds"
                value={person.id}
              />
            ))}
          </div>
          {state.errors?.inviteePlatformUserIds && (
            <p className={styles.fieldError} role="alert">
              {state.errors.inviteePlatformUserIds}
            </p>
          )}
        </fieldset>
      </fieldset>

      <div className={styles.formActions}>
        <SubmitButton pendingLabel="Guardando evento…">
          {mode === "create" ? "Crear evento" : "Guardar cambios"}
        </SubmitButton>
        <Button onClick={handleCancel} variant="quiet">
          Cancelar
        </Button>
      </div>
    </ElevatedSurface>
  );
}
