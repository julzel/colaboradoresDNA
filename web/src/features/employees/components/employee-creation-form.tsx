"use client";

import { useActionState, useState, type MouseEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  KeyRound,
  Mail,
  Palmtree,
  ShieldCheck,
  UserRound,
  UserRoundCog,
  Info,
} from "lucide-react";

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
import type { EmployeeManagerOption } from "@/features/employees/view-models/employee-view";

import styles from "./employee-creation-form.module.css";
import { FormErrorSummary } from "./form-error-summary";
import { IdentificationFields } from "./identification-fields";
import { useGuardedForm } from "./use-guarded-form";

const steps = [
  "Información personal",
  "Información laboral y acceso",
  "Asignación",
  "Revisar y crear",
] as const;

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
    if (target === 3 && formRef.current) {
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
          <li
            aria-current={step === index ? "step" : undefined}
            data-completed={index < step || undefined}
            key={label}
          >
            <span className={styles.stepNumber} aria-hidden="true">
              {index < step ? <Check size={16} /> : index + 1}
            </span>
            <span className={styles.stepLabel}>{label}</span>
          </li>
        ))}
      </ol>
      <FormErrorSummary state={state} />
      <header className={styles.sectionHeading}>
        <p className={styles.stepCount}>
          Paso {step + 1} de {steps.length}
        </p>
        {/* <h2>{steps[step]}</h2> */}
      </header>

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
            defaultValue=""
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
          <IdentificationFields
            identificationError={state.errors?.identification}
            typeError={state.errors?.["identification.type"]}
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
          <p className={`${styles.note} ${styles.fullWidth}`}>
            <Info size={18} aria-hidden="true" />
            Administración y supervisión requieren verificación en dos pasos.
          </p>
          <div className={styles.fullWidth}>
            <CheckboxField
              description="Si lo dejás pendiente, podrás enviar la invitación después desde el detalle del colaborador."
              id="sendInvitation"
              label="Enviar invitación de acceso ahora"
              name="sendInvitation"
            />
          </div>
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
            defaultValue=""
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
          {departments.length === 0 && (
            <p className={`${styles.note} ${styles.fullWidth}`} role="status">
              No hay departamentos disponibles. Creá uno en Departamentos antes de
              completar el registro.
            </p>
          )}
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

      <section data-step-section="3" hidden={step !== 3}>
        <dl className={styles.summary}>
          <div>
            <dt>
              <UserRound aria-hidden="true" className={styles.summaryIcon} />
              Nombre
            </dt>
            <dd>
              {[review.givenNames, review.firstSurname, review.secondSurname]
                .filter(Boolean)
                .join(" ")}
            </dd>
          </div>
          <div>
            <dt>
              <Mail aria-hidden="true" className={styles.summaryIcon} />
              Correo personal
            </dt>
            <dd>{review.email}</dd>
          </div>
          <div>
            <dt>
              <KeyRound aria-hidden="true" className={styles.summaryIcon} />
              Invitación de acceso
            </dt>
            <dd>
              {review.sendInvitation === "on"
                ? "Se enviará al crear"
                : "Pendiente para enviar después"}
            </dd>
          </div>
          <div>
            <dt>
              <ShieldCheck aria-hidden="true" className={styles.summaryIcon} />
              Rol de plataforma
            </dt>
            <dd>
              {review.role === "administrator"
                ? "Administrador"
                : review.role === "supervisor"
                  ? "Supervisor"
                  : "Colaborador"}
            </dd>
          </div>
          <div>
            <dt>
              <Building2 aria-hidden="true" className={styles.summaryIcon} />
              Departamento
            </dt>
            <dd>
              {
                departments.find((department) => department.id === review.departmentId)
                  ?.name
              }
            </dd>
          </div>
          <div>
            <dt>
              <UserRoundCog aria-hidden="true" className={styles.summaryIcon} />
              Jefatura directa
            </dt>
            <dd>
              {managers.find((manager) => manager.id === review.managerEmployeeId)
                ?.displayName ?? "Sin asignar"}
            </dd>
          </div>
          <div>
            <dt>
              <BriefcaseBusiness aria-hidden="true" className={styles.summaryIcon} />
              Puesto
            </dt>
            <dd>{review.positionTitle}</dd>
          </div>
          <div>
            <dt>
              <CalendarDays aria-hidden="true" className={styles.summaryIcon} />
              Fecha de ingreso
            </dt>
            <dd>{review.employmentStartedOn}</dd>
          </div>
          <div>
            <dt>
              <Palmtree aria-hidden="true" className={styles.summaryIcon} />
              Saldo inicial de vacaciones
            </dt>
            <dd>{review.initialPtoBalanceDays} días</dd>
          </div>
        </dl>
        <div className={styles.actions}>
          <Button
            className={styles.reviewAction}
            data-step="0"
            onClick={handleStepChange}
            variant="quiet"
          >
            Cambiar información personal
          </Button>
          <Button
            className={styles.reviewAction}
            data-step="1"
            onClick={handleStepChange}
            variant="quiet"
          >
            Cambiar acceso
          </Button>
          <Button
            className={styles.reviewAction}
            data-step="2"
            onClick={handleStepChange}
            variant="quiet"
          >
            Cambiar asignación
          </Button>
        </div>
      </section>

      <div className={styles.footer}>
        <Button onClick={handleCancel} variant="quiet">
          Cancelar
        </Button>
        <div className={styles.navigation}>
          {step > 0 && (
            <Button data-step={step - 1} onClick={handleStepChange} variant="secondary">
              <ArrowLeft size={18} aria-hidden="true" /> Anterior
            </Button>
          )}
          {step < 3 ? (
            <Button data-step={step + 1} onClick={handleStepChange}>
              Continuar <ArrowRight size={18} aria-hidden="true" />
            </Button>
          ) : (
            <SubmitButton pendingLabel="Creando colaborador…">
              Crear colaborador
            </SubmitButton>
          )}
        </div>
      </div>
    </ElevatedSurface>
  );
}
