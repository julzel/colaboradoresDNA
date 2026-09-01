"use client";

import { useActionState, useState, type ChangeEvent, type FormEvent } from "react";
import { CalendarPlus, Info, Plus, Trash2 } from "lucide-react";

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
  createOneOnOneAction,
  updateOneOnOneAction,
} from "@/features/development/actions/development-actions";
import { initialDevelopmentActionState } from "@/features/development/domain/development-action-state";
import type {
  OneOnOneActionOwner,
  OneOnOneDetail,
} from "@/features/development/domain/one-on-one";
import { useGuardedForm } from "@/features/employees/components/use-guarded-form";

import styles from "./one-on-one.module.css";

type EditorAction = {
  description: string;
  dueOn: string;
  key: string;
  owner: OneOnOneActionOwner;
};

const sectionHeadings = {
  achievements: "Avances y logros",
  blockers: "Retos o bloqueos",
  feedback: "Retroalimentación y oportunidades",
  organizationSupport: "Apoyo acordado por la organización",
} as const;

function sectionValue(meeting: OneOnOneDetail | undefined, heading: string) {
  return (
    meeting?.discussionSections.find((section) => section.heading === heading)?.notes ??
    ""
  );
}

function initialActions(meeting?: OneOnOneDetail): EditorAction[] {
  return (
    meeting?.actions.map((action) => ({
      description: action.description,
      dueOn: action.dueOn ?? "",
      key: action.id,
      owner: action.owner,
    })) ?? []
  );
}

export function OneOnOneForm({
  cancelHref,
  employeeId,
  employeeName,
  meeting,
  today,
}: {
  cancelHref: string;
  employeeId: string;
  employeeName: string;
  meeting?: OneOnOneDetail;
  today: string;
}) {
  const action = meeting
    ? updateOneOnOneAction.bind(null, employeeId, meeting.id)
    : createOneOnOneAction.bind(null, employeeId);
  const [state, formAction] = useActionState(action, initialDevelopmentActionState);
  const [actions, setActions] = useState<EditorAction[]>(initialActions(meeting));
  const [occurredOn, setOccurredOn] = useState(meeting?.occurredOn ?? today);
  const [scheduleEvent, setScheduleEvent] = useState(false);
  const [calendarStart, setCalendarStart] = useState(
    `${meeting?.occurredOn ?? today}T09:00`,
  );
  const [calendarEnd, setCalendarEnd] = useState(
    `${meeting?.occurredOn ?? today}T09:30`,
  );
  const { dirty, formRef, handleCancel, handleChange, handleSubmit } =
    useGuardedForm(cancelHref);
  const linkedCalendar = Boolean(meeting?.calendarEventId);

  function addAction() {
    setActions((current) => [
      ...current,
      { description: "", dueOn: "", key: crypto.randomUUID(), owner: "employee" },
    ]);
  }

  function removeAction(key: string) {
    setActions((current) => current.filter((actionItem) => actionItem.key !== key));
  }

  function handleDateChange(event: ChangeEvent<HTMLInputElement>) {
    const nextDate = event.currentTarget.value;
    setOccurredOn(nextDate);
    setCalendarStart((current) => `${nextDate}T${current.slice(-5)}`);
    setCalendarEnd((current) => `${nextDate}T${current.slice(-5)}`);
  }

  function submitWithConfirmation(event: FormEvent<HTMLFormElement>) {
    const nativeEvent = event.nativeEvent as SubmitEvent;
    const submitter = nativeEvent.submitter as HTMLButtonElement | null;
    if (
      submitter?.value === "finalized" &&
      !window.confirm(
        "¿Finalizar este 1:1? Después no podrás editar su contenido; los cambios futuros se registrarán como correcciones.",
      )
    ) {
      event.preventDefault();
      return;
    }
    handleSubmit(event);
  }

  return (
    <form
      action={formAction}
      className={styles.formLayout}
      data-unsaved-changes={dirty ? "true" : undefined}
      onChange={handleChange}
      onSubmit={submitWithConfirmation}
      ref={formRef}
    >
      {meeting && <input name="version" type="hidden" value={meeting.version} />}
      <div className={styles.formMain}>
        {state.status === "error" && (
          <div className={styles.errorSummary} role="alert" tabIndex={-1}>
            <strong>No pudimos guardar el 1:1</strong>
            <p>{state.message}</p>
          </div>
        )}

        <ElevatedSurface as="section" className={styles.formSection}>
          <div className={styles.sectionHeading}>
            <span>1</span>
            <div>
              <h2>Lo esencial</h2>
              <p>Fecha y resumen que permiten retomar la conversación fácilmente.</p>
            </div>
          </div>
          <TextField
            error={state.errors?.occurredOn}
            id="occurredOn"
            label="Fecha de la conversación"
            name="occurredOn"
            onChange={handleDateChange}
            required
            type="date"
            value={occurredOn}
          />
          <TextAreaField
            defaultValue={meeting?.sharedSummary ?? ""}
            description="Una síntesis breve de los acuerdos y el contexto importante."
            error={state.errors?.sharedSummary}
            id="sharedSummary"
            label="Resumen del 1:1"
            maxLength={1500}
            name="sharedSummary"
            optional
            rows={5}
          />
        </ElevatedSurface>

        <ElevatedSurface as="section" className={styles.formSection}>
          <div className={styles.sectionHeading}>
            <span>2</span>
            <div>
              <h2>Temas de conversación</h2>
              <p>Completá solo lo que aporte contexto o requiera seguimiento.</p>
            </div>
          </div>
          <div className={styles.topicGrid}>
            {(
              Object.entries(sectionHeadings) as Array<
                [keyof typeof sectionHeadings, string]
              >
            ).map(([name, label]) => (
              <TextAreaField
                defaultValue={sectionValue(meeting, label)}
                error={state.errors?.[name]}
                id={name}
                key={name}
                label={label}
                maxLength={2000}
                name={name}
                optional
                rows={4}
              />
            ))}
          </div>
        </ElevatedSurface>

        <ElevatedSurface as="section" className={styles.formSection}>
          <div className={styles.sectionHeadingRow}>
            <div className={styles.sectionHeading}>
              <span>3</span>
              <div>
                <h2>Acciones acordadas</h2>
                <p>
                  Convertí acuerdos concretos en próximos pasos que se puedan cerrar.
                </p>
              </div>
            </div>
            <Button onClick={addAction} size="small" variant="secondary">
              <Plus aria-hidden="true" size={17} />
              Agregar acción
            </Button>
          </div>
          {actions.length ? (
            <div className={styles.actionEditorList}>
              {actions.map((actionItem, index) => (
                <fieldset className={styles.actionEditor} key={actionItem.key}>
                  <legend>Acción {index + 1}</legend>
                  <TextField
                    defaultValue={actionItem.description}
                    error={state.errors?.[`agreedActions.${index}.description`]}
                    id={`action-description-${index}`}
                    label="Próximo paso"
                    maxLength={300}
                    name="actionDescription"
                    required
                  />
                  <div className={styles.actionFields}>
                    <SelectField
                      defaultValue={actionItem.owner}
                      error={state.errors?.[`agreedActions.${index}.owner`]}
                      id={`action-owner-${index}`}
                      label="Responsable"
                      name="actionOwner"
                    >
                      <option value="employee">Colaborador</option>
                      <option value="organization">Organización</option>
                      <option value="shared">Ambos</option>
                    </SelectField>
                    <TextField
                      defaultValue={actionItem.dueOn}
                      error={state.errors?.[`agreedActions.${index}.dueOn`]}
                      id={`action-due-${index}`}
                      label="Fecha objetivo"
                      name="actionDueOn"
                      optional
                      type="date"
                    />
                  </div>
                  <Button
                    aria-label={`Eliminar acción ${index + 1}`}
                    className={styles.removeAction}
                    onClick={() => removeAction(actionItem.key)}
                    size="small"
                    variant="danger"
                  >
                    <Trash2 aria-hidden="true" size={16} />
                    Eliminar
                  </Button>
                </fieldset>
              ))}
            </div>
          ) : (
            <p className={styles.inlineEmpty}>
              No hay acciones. Agregá una solamente cuando exista un próximo paso claro.
            </p>
          )}
        </ElevatedSurface>

        <ElevatedSurface as="section" className={styles.formSection}>
          <div className={styles.sectionHeading}>
            <span>4</span>
            <div>
              <h2>Calendario</h2>
              <p>
                La cita será privada para las personas invitadas y nunca incluirá notas.
              </p>
            </div>
          </div>
          {linkedCalendar ? (
            <div className={styles.calendarLinked}>
              <CalendarPlus aria-hidden="true" />
              <div>
                <strong>Evento de calendario vinculado</strong>
                <p>La fecha y hora se administran desde Calendario.</p>
              </div>
            </div>
          ) : (
            <>
              <CheckboxField
                checked={scheduleEvent}
                description={`Crea “Reunión 1:1” visible solo para vos y ${employeeName}.`}
                id="scheduleCalendarEvent"
                label="Agregar esta conversación al calendario"
                name="scheduleCalendarEvent"
                onChange={(event) => setScheduleEvent(event.currentTarget.checked)}
              />
              {scheduleEvent && (
                <div className={styles.calendarFields}>
                  <TextField
                    error={state.errors?.calendarStartDateTime}
                    id="calendarStartDateTime"
                    label="Inicio"
                    name="calendarStartDateTime"
                    onChange={(event) => setCalendarStart(event.currentTarget.value)}
                    required
                    type="datetime-local"
                    value={calendarStart}
                  />
                  <TextField
                    error={state.errors?.calendarEndDateTime}
                    id="calendarEndDateTime"
                    label="Final"
                    name="calendarEndDateTime"
                    onChange={(event) => setCalendarEnd(event.currentTarget.value)}
                    required
                    type="datetime-local"
                    value={calendarEnd}
                  />
                </div>
              )}
            </>
          )}
        </ElevatedSurface>
      </div>

      <aside className={styles.formAside}>
        <div className={styles.privacyNote}>
          <Info aria-hidden="true" />
          <div>
            <strong>Escribí para acompañar</strong>
            <p>
              Registrá hechos observables, acuerdos y apoyo. Evitá información médica,
              familiar, rumores o datos personales no relacionados con el trabajo.
            </p>
          </div>
        </div>
        <div className={styles.formActions}>
          <SubmitButton name="intent" pendingLabel="Finalizando…" value="finalized">
            Finalizar 1:1
          </SubmitButton>
          <SubmitButton
            name="intent"
            pendingLabel="Guardando…"
            value="draft"
            variant="secondary"
          >
            Guardar borrador
          </SubmitButton>
          <Button onClick={handleCancel} variant="quiet">
            Cancelar
          </Button>
        </div>
      </aside>
    </form>
  );
}
