"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button/button";
import { SubmitButton } from "@/components/ui/feedback/submit-button";
import { TextField } from "@/components/ui/form-field/form-field";
import { updateEmployeeScheduleAction } from "@/features/employees/actions/employee-actions";
import { initialEmployeeActionState } from "@/features/employees/domain/employee-action-state";
import type { ScheduledDay } from "@/features/employees/domain/schedule";

import styles from "./employee-management.module.css";
import { FormErrorSummary } from "./form-error-summary";
import { ScheduleFields } from "./schedule-fields";
import { useGuardedForm } from "./use-guarded-form";

type ScheduleFormProps = {
  employeeId: string;
  initialDays: ScheduledDay[];
};

export function ScheduleForm({ employeeId, initialDays }: ScheduleFormProps) {
  const [state, action] = useActionState(
    updateEmployeeScheduleAction,
    initialEmployeeActionState,
  );
  const { formRef, handleCancel, handleChange, handleSubmit } = useGuardedForm(
    `/admin/colaboradores/${employeeId}`,
  );

  return (
    <form
      action={action}
      className={styles.formCard}
      onChange={handleChange}
      onSubmit={handleSubmit}
      ref={formRef}
    >
      <input name="employeeId" type="hidden" value={employeeId} />
      <FormErrorSummary state={state} />
      <TextField
        error={state.errors?.effectiveFrom}
        id="effectiveFrom"
        label="Vigente desde"
        name="effectiveFrom"
        required
        type="date"
      />
      <ScheduleFields initialDays={initialDays} />
      <div className={styles.actions}>
        <SubmitButton pendingLabel="Guardando horario…">Guardar cambios</SubmitButton>
        <Button onClick={handleCancel} variant="quiet">
          Cancelar
        </Button>
      </div>
    </form>
  );
}
