"use client";

import { useActionState, useState, type MouseEvent } from "react";

import { Button } from "@/components/ui/button/button";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { SubmitButton } from "@/components/ui/feedback/submit-button";
import {
  CheckboxField,
  SelectField,
  TextField,
} from "@/components/ui/form-field/form-field";
import { createEmployeeAction } from "@/features/employees/actions/employee-actions";
import type { Department } from "@/features/employees/domain/department";
import { birthdayMonthOptions } from "@/features/employees/domain/employee";
import { initialEmployeeActionState } from "@/features/employees/domain/employee-action-state";
import {
  dayOfWeekOrder,
  type ScheduledDay,
} from "@/features/employees/domain/schedule";
import type { EmployeeManagerOption } from "@/features/employees/view-models/employee-view";

import styles from "./employee-management.module.css";
import { FormErrorSummary } from "./form-error-summary";
import { ScheduleFields } from "./schedule-fields";
import { useGuardedForm } from "./use-guarded-form";

const steps = [
  "Información personal",
  "Información laboral y acceso",
  "Asignación",
  "Horario",
  "Revisar y crear",
] as const;

const initialDays: ScheduledDay[] = dayOfWeekOrder.map((dayOfWeek, index) => ({
  dayOfWeek,
  halfDayPeriod: null,
  workFraction: index < 5 ? 1 : 0,
}));

type EmployeeCreationFormProps = {
  departments: Department[];
  managers: EmployeeManagerOption[];
};

export function EmployeeCreationForm({
  departments,
  managers,
}: EmployeeCreationFormProps) {
  const [state, action] = useActionState(
    createEmployeeAction,
    initialEmployeeActionState,
  );
  const [step, setStep] = useState(0);
  const [review, setReview] = useState<Record<string, string>>({});
  const { formRef, handleCancel, handleChange, handleSubmit } =
    useGuardedForm("/admin/colaboradores");

  function handleStepChange(event: MouseEvent<HTMLButtonElement>) {
    const target = Number(event.currentTarget.dataset.step);
    if (!Number.isInteger(target)) return;
    const currentSection = formRef.current?.querySelector<HTMLElement>(
      `[data-step-section="${step}"]`,
    );
    if (target > step && currentSection) {
      const controls = currentSection.querySelectorAll<
        HTMLInputElement | HTMLSelectElement
      >("input, select");
      for (const control of controls) {
        if (!control.checkValidity()) {
          control.reportValidity();
          return;
        }
      }
    }
    if (target === 4 && formRef.current) {
      const values: Record<string, string> = {};
      new FormData(formRef.current).forEach((value, key) => {
        if (typeof value === "string") values[key] = value;
      });
      setReview(values);
    }
    setStep(target);
  }

  return (
    <ElevatedSurface
      action={action}
      as="form"
      className={styles.formCard}
      onChange={handleChange}
      onSubmit={handleSubmit}
      ref={formRef}
    >
      <ol aria-label="Progreso del registro" className={styles.stepList}>
        {steps.map((label, index) => (
          <li aria-current={step === index ? "step" : undefined} key={label}>
            {index + 1}. {label}
          </li>
        ))}
      </ol>
      <FormErrorSummary state={state} />

      <fieldset data-step-section="0" hidden={step !== 0}>
        <div className={styles.formGrid}>
          <TextField id="givenNames" label="Nombre" name="givenNames" required />
          <TextField
            id="firstSurname"
            label="Primer apellido"
            name="firstSurname"
            required
          />
          <TextField
            id="secondSurname"
            label="Segundo apellido"
            name="secondSurname"
            optional
          />
          <TextField
            id="phoneNumber"
            label="Teléfono"
            name="phoneNumber"
            optional
            type="tel"
          />
          <TextField
            id="birthDay"
            label="Día de cumpleaños"
            max={31}
            min={1}
            name="birthDay"
            required
            type="number"
          />
          <SelectField
            id="birthMonth"
            label="Mes de cumpleaños"
            name="birthMonth"
            required
          >
            <option disabled value="">
              Seleccioná un mes
            </option>
            {birthdayMonthOptions.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </SelectField>
          <SelectField
            id="identificationType"
            label="Tipo de identificación"
            name="identificationType"
          >
            <option value="national_id">Cédula</option>
            <option value="residence_id">DIMEX</option>
            <option value="other">Otro</option>
          </SelectField>
          <TextField
            id="identificationValue"
            label="Identificación"
            name="identificationValue"
            required
          />
          <div className={styles.fullWidth}>
            <CheckboxField
              defaultChecked
              id="shareBirthdayOnCalendar"
              label="Compartir cumpleaños en el calendario"
              name="shareBirthdayOnCalendar"
            />
          </div>
        </div>
      </fieldset>

      <fieldset data-step-section="1" hidden={step !== 1}>
        <div className={styles.formGrid}>
          <TextField
            id="email"
            label="Correo personal"
            name="email"
            required
            type="email"
          />
          <SelectField id="role" label="Rol de plataforma" name="role">
            <option value="collaborator">Colaborador</option>
            <option value="supervisor">Supervisor</option>
            <option value="administrator">Administrador</option>
          </SelectField>
          <TextField
            id="employmentStartedOn"
            label="Fecha de ingreso"
            name="employmentStartedOn"
            required
            type="date"
          />
          <TextField
            defaultValue="0"
            id="initialPtoBalanceDays"
            label="Saldo inicial de vacaciones (días)"
            name="initialPtoBalanceDays"
            required
            step="0.5"
            type="number"
          />
        </div>
      </fieldset>

      <fieldset data-step-section="2" hidden={step !== 2}>
        <div className={styles.formGrid}>
          <SelectField
            id="departmentId"
            label="Departamento"
            name="departmentId"
            required
          >
            <option disabled value="">
              Seleccioná un departamento
            </option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </SelectField>
          <TextField id="positionTitle" label="Puesto" name="positionTitle" required />
          <SelectField
            id="managerEmployeeId"
            label="Jefatura directa"
            name="managerEmployeeId"
            optional
          >
            <option value="">Sin asignar</option>
            {managers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.displayName}
              </option>
            ))}
          </SelectField>
        </div>
      </fieldset>

      <fieldset data-step-section="3" hidden={step !== 3}>
        <ScheduleFields initialDays={initialDays} />
      </fieldset>

      <section data-step-section="4" hidden={step !== 4}>
        <h2>Revisar y crear</h2>
        <dl className={styles.summary}>
          <div>
            <dt>Nombre</dt>
            <dd>
              {[review.givenNames, review.firstSurname, review.secondSurname]
                .filter(Boolean)
                .join(" ")}
            </dd>
          </div>
          <div>
            <dt>Correo personal</dt>
            <dd>{review.email}</dd>
          </div>
          <div>
            <dt>Puesto</dt>
            <dd>{review.positionTitle}</dd>
          </div>
          <div>
            <dt>Fecha de ingreso</dt>
            <dd>{review.employmentStartedOn}</dd>
          </div>
          <div>
            <dt>Saldo inicial de vacaciones</dt>
            <dd>{review.initialPtoBalanceDays} días</dd>
          </div>
        </dl>
        <div className={styles.actions}>
          <Button data-step="0" onClick={handleStepChange} variant="quiet">
            Cambiar información personal
          </Button>
          <Button data-step="1" onClick={handleStepChange} variant="quiet">
            Cambiar acceso
          </Button>
          <Button data-step="2" onClick={handleStepChange} variant="quiet">
            Cambiar asignación
          </Button>
          <Button data-step="3" onClick={handleStepChange} variant="quiet">
            Cambiar horario
          </Button>
        </div>
      </section>

      <div className={styles.actions}>
        {step > 0 && (
          <Button data-step={step - 1} onClick={handleStepChange} variant="secondary">
            Anterior
          </Button>
        )}
        {step < 4 ? (
          <Button data-step={step + 1} onClick={handleStepChange}>
            Continuar
          </Button>
        ) : (
          <SubmitButton pendingLabel="Creando colaborador…">
            Crear colaborador
          </SubmitButton>
        )}
        <Button onClick={handleCancel} variant="quiet">
          Cancelar
        </Button>
      </div>
    </ElevatedSurface>
  );
}
