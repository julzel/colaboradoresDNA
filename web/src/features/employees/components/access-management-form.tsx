"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button/button";
import { SubmitButton } from "@/components/ui/feedback/submit-button";
import {
  CheckboxField,
  SelectField,
  TextField,
} from "@/components/ui/form-field/form-field";
import {
  endEmployeeEmploymentAction,
  updateEmployeeAccessAction,
} from "@/features/employees/actions/employee-actions";
import type { PlatformRole } from "@/features/auth/domain/platform-user";
import { initialEmployeeActionState } from "@/features/employees/domain/employee-action-state";

import styles from "./employee-management.module.css";
import { FormErrorSummary } from "./form-error-summary";
import { useGuardedForm } from "./use-guarded-form";

type AccessManagementFormProps = {
  employeeId: string;
  employmentActive: boolean;
  role: PlatformRole;
};

export function AccessManagementForm({
  employeeId,
  employmentActive,
  role,
}: AccessManagementFormProps) {
  const [accessState, accessAction] = useActionState(
    updateEmployeeAccessAction,
    initialEmployeeActionState,
  );
  const [employmentState, employmentAction] = useActionState(
    endEmployeeEmploymentAction,
    initialEmployeeActionState,
  );
  const cancelHref = `/admin/colaboradores/${employeeId}`;
  const {
    formRef: accessFormRef,
    handleCancel: handleAccessCancel,
    handleChange: handleAccessChange,
    handleSubmit: handleAccessSubmit,
  } = useGuardedForm(cancelHref);
  const {
    formRef: employmentFormRef,
    handleCancel: handleEmploymentCancel,
    handleChange: handleEmploymentChange,
    handleSubmit: handleEmploymentSubmit,
  } = useGuardedForm(cancelHref);

  return (
    <>
      <form
        action={accessAction}
        className={styles.formCard}
        onChange={handleAccessChange}
        onSubmit={handleAccessSubmit}
        ref={accessFormRef}
      >
        <input name="employeeId" type="hidden" value={employeeId} />
        <h2>Rol de plataforma</h2>
        <p className={styles.muted}>
          Administración y supervisión requieren MFA. El rol no se infiere del puesto ni
          del departamento.
        </p>
        <FormErrorSummary state={accessState} />
        <SelectField defaultValue={role} id="role" label="Rol" name="role">
          <option value="administrator">Administrador</option>
          <option value="supervisor">Supervisor</option>
          <option value="collaborator">Colaborador</option>
        </SelectField>
        <div className={styles.actions}>
          <SubmitButton pendingLabel="Guardando acceso…">Guardar cambios</SubmitButton>
          <Button onClick={handleAccessCancel} variant="quiet">
            Cancelar
          </Button>
        </div>
      </form>

      {employmentActive && (
        <form
          action={employmentAction}
          className={`${styles.formCard} ${styles.dangerZone}`}
          data-confirmation="¿Finalizar la relación laboral? El acceso se desactivará y las sesiones activas se revocarán. Los registros históricos se conservarán."
          onChange={handleEmploymentChange}
          onSubmit={handleEmploymentSubmit}
          ref={employmentFormRef}
        >
          <input name="employeeId" type="hidden" value={employeeId} />
          <h2>Finalizar relación laboral</h2>
          <p className={styles.muted}>
            Esta acción conserva el historial, marca a la persona como inactiva, cierra
            sus períodos vigentes y bloquea su acceso.
          </p>
          <FormErrorSummary state={employmentState} />
          <TextField
            error={employmentState.errors?.endedOn}
            id="endedOn"
            label="Fecha de salida"
            name="endedOn"
            required
            type="date"
          />
          <CheckboxField
            description="Confirmo que el acceso y las sesiones deben revocarse."
            id="confirmation"
            label="Comprendo el efecto de esta acción"
            name="confirmation"
            required
          />
          <div className={styles.actions}>
            <SubmitButton pendingLabel="Finalizando relación…" variant="danger">
              Finalizar relación laboral
            </SubmitButton>
            <Button onClick={handleEmploymentCancel} variant="quiet">
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
