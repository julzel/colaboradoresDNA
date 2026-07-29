"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button/button";
import { SubmitButton } from "@/components/ui/feedback/submit-button";
import {
  CheckboxField,
  SelectField,
  TextField,
} from "@/components/ui/form-field/form-field";
import { updateEmployeePersonalAction } from "@/features/employees/actions/employee-actions";
import { initialEmployeeActionState } from "@/features/employees/domain/employee-action-state";
import {
  birthdayMonthOptions,
  type IdentificationType,
} from "@/features/employees/domain/employee";

import styles from "./employee-management.module.css";
import { FormErrorSummary } from "./form-error-summary";
import { useGuardedForm } from "./use-guarded-form";

type PersonalInformationFormProps = {
  employee: {
    birthDay: number;
    birthMonth: number;
    firstSurname: string;
    givenNames: string;
    id: string;
    identification: {
      type: IdentificationType;
      value: string;
    };
    phoneDisplayValue: string | null;
    secondSurname: string | null;
    shareBirthdayOnCalendar: boolean;
  };
};

export function PersonalInformationForm({ employee }: PersonalInformationFormProps) {
  const [state, action] = useActionState(
    updateEmployeePersonalAction,
    initialEmployeeActionState,
  );
  const cancelHref = `/admin/colaboradores/${employee.id}`;
  const { formRef, handleCancel, handleChange, handleSubmit } =
    useGuardedForm(cancelHref);

  return (
    <form
      action={action}
      className={styles.formCard}
      onChange={handleChange}
      onSubmit={handleSubmit}
      ref={formRef}
    >
      <input name="employeeId" type="hidden" value={employee.id} />
      <FormErrorSummary state={state} />
      <div className={styles.formGrid}>
        <TextField
          defaultValue={employee.givenNames}
          error={state.errors?.givenNames}
          id="givenNames"
          label="Nombre"
          maxLength={120}
          name="givenNames"
          required
        />
        <TextField
          defaultValue={employee.firstSurname}
          error={state.errors?.firstSurname}
          id="firstSurname"
          label="Primer apellido"
          maxLength={120}
          name="firstSurname"
          required
        />
        <TextField
          defaultValue={employee.secondSurname ?? ""}
          error={state.errors?.secondSurname}
          id="secondSurname"
          label="Segundo apellido"
          maxLength={120}
          name="secondSurname"
          optional
        />
        <div className={styles.formGrid}>
          <TextField
            defaultValue={employee.birthDay}
            error={state.errors?.birthDay}
            id="birthDay"
            inputMode="numeric"
            label="Día de cumpleaños"
            max={31}
            min={1}
            name="birthDay"
            required
            type="number"
          />
          <SelectField
            defaultValue={employee.birthMonth}
            error={state.errors?.birthMonth}
            id="birthMonth"
            label="Mes"
            name="birthMonth"
            required
          >
            {birthdayMonthOptions.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </SelectField>
        </div>
        <TextField
          defaultValue={employee.phoneDisplayValue ?? ""}
          error={state.errors?.phoneNumber}
          id="phoneNumber"
          label="Teléfono"
          name="phoneNumber"
          optional
          type="tel"
        />
        <SelectField
          defaultValue={employee.identification.type}
          error={state.errors?.["identification.type"]}
          id="identificationType"
          label="Tipo de identificación"
          name="identificationType"
          required
        >
          <option value="national_id">Cédula</option>
          <option value="residence_id">DIMEX</option>
          <option value="other">Otro</option>
        </SelectField>
        <TextField
          defaultValue={employee.identification.value}
          error={state.errors?.identification}
          id="identificationValue"
          label="Identificación"
          name="identificationValue"
          required
        />
        <div className={styles.fullWidth}>
          <CheckboxField
            defaultChecked={employee.shareBirthdayOnCalendar}
            description="Las personas podrán ver el cumpleaños en el calendario. Administración siempre puede verlo."
            id="shareBirthdayOnCalendar"
            label="Compartir cumpleaños en el calendario"
            name="shareBirthdayOnCalendar"
          />
        </div>
      </div>
      <div className={styles.actions}>
        <SubmitButton pendingLabel="Guardando cambios…">Guardar cambios</SubmitButton>
        <Button onClick={handleCancel} variant="quiet">
          Cancelar
        </Button>
      </div>
    </form>
  );
}
