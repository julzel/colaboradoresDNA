"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button/button";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { SubmitButton } from "@/components/ui/feedback/submit-button";
import {
  CheckboxField,
  SelectField,
  TextField,
} from "@/components/ui/form-field/form-field";
import {
  endEmployeeEmploymentAction,
  updateEmployeeAccessAction,
  updateEmployeeEmailAction,
} from "@/features/employees/actions/employee-actions";
import type {
  PlatformRole,
  PlatformUserStatus,
} from "@/features/auth/domain/platform-user";
import { initialEmployeeActionState } from "@/features/employees/domain/employee-action-state";

import styles from "./employee-management.module.css";
import { FormErrorSummary } from "./form-error-summary";
import { useGuardedForm } from "./use-guarded-form";

type AccessManagementFormProps = {
  accessStatus: PlatformUserStatus;
  email: string;
  employeeId: string;
  employmentActive: boolean;
  role: PlatformRole;
};

export function AccessManagementForm({
  accessStatus,
  email,
  employeeId,
  employmentActive,
  role,
}: AccessManagementFormProps) {
  const [emailState, emailAction] = useActionState(
    updateEmployeeEmailAction,
    initialEmployeeActionState,
  );
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
    formRef: emailFormRef,
    handleCancel: handleEmailCancel,
    handleChange: handleEmailChange,
    handleSubmit: handleEmailSubmit,
  } = useGuardedForm(cancelHref);
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
      <ElevatedSurface
        action={emailAction}
        as="form"
        className={styles.formCard}
        onChange={handleEmailChange}
        onSubmit={handleEmailSubmit}
        ref={emailFormRef}
      >
        <input name="employeeId" type="hidden" value={employeeId} />
        <h2>Correo de acceso</h2>
        <p className={styles.muted}>
          Solo administración puede cambiar este correo. Se actualizará también en el
          proveedor de acceso y el cambio quedará auditado.
        </p>
        <FormErrorSummary state={emailState} />
        <TextField
          autoComplete="email"
          defaultValue={email}
          disabled={accessStatus === "deactivated"}
          error={emailState.errors?.email}
          id="email"
          label="Correo personal"
          name="email"
          required
          type="email"
        />
        {accessStatus !== "deactivated" && (
          <div className={styles.actions}>
            <SubmitButton pendingLabel="Actualizando correo…">
              Actualizar correo
            </SubmitButton>
            <Button onClick={handleEmailCancel} variant="quiet">
              Cancelar
            </Button>
          </div>
        )}
      </ElevatedSurface>

      <ElevatedSurface
        action={accessAction}
        as="form"
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
      </ElevatedSurface>

      {employmentActive && (
        <ElevatedSurface
          action={employmentAction}
          as="form"
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
        </ElevatedSurface>
      )}
    </>
  );
}
