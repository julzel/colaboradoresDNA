"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button/button";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { SubmitButton } from "@/components/ui/feedback/submit-button";
import { SelectField, TextField } from "@/components/ui/form-field/form-field";
import { updateEmployeeAssignmentAction } from "@/features/employees/actions/employee-actions";
import { initialEmployeeActionState } from "@/features/employees/domain/employee-action-state";
import type { Department } from "@/features/employees/domain/department";
import type { EmployeeManagerOption } from "@/features/employees/server/employee-read-repository";

import styles from "./employee-management.module.css";
import { FormErrorSummary } from "./form-error-summary";
import { useGuardedForm } from "./use-guarded-form";

type AssignmentFormProps = {
  current: {
    departmentId: string;
    managerEmployeeId: string | null;
    positionTitle: string;
  } | null;
  departments: Department[];
  employeeId: string;
  managers: EmployeeManagerOption[];
};

export function AssignmentForm({
  current,
  departments,
  employeeId,
  managers,
}: AssignmentFormProps) {
  const [state, action] = useActionState(
    updateEmployeeAssignmentAction,
    initialEmployeeActionState,
  );
  const { formRef, handleCancel, handleChange, handleSubmit } = useGuardedForm(
    `/admin/colaboradores/${employeeId}`,
  );

  return (
    <ElevatedSurface
      action={action}
      as="form"
      className={styles.formCard}
      onChange={handleChange}
      onSubmit={handleSubmit}
      ref={formRef}
    >
      <input name="employeeId" type="hidden" value={employeeId} />
      <FormErrorSummary state={state} />
      <div className={styles.formGrid}>
        <SelectField
          defaultValue={current?.departmentId}
          error={state.errors?.departmentId}
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
        <TextField
          defaultValue={current?.positionTitle}
          error={state.errors?.positionTitle}
          id="positionTitle"
          label="Puesto"
          maxLength={120}
          name="positionTitle"
          required
        />
        <SelectField
          defaultValue={current?.managerEmployeeId ?? ""}
          error={state.errors?.managerEmployeeId}
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
        <TextField
          error={state.errors?.effectiveFrom}
          id="effectiveFrom"
          label="Vigente desde"
          name="effectiveFrom"
          required
          type="date"
        />
      </div>
      <div className={styles.actions}>
        <SubmitButton pendingLabel="Guardando asignación…">
          Guardar cambios
        </SubmitButton>
        <Button onClick={handleCancel} variant="quiet">
          Cancelar
        </Button>
      </div>
    </ElevatedSurface>
  );
}
