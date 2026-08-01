"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/ui/feedback/submit-button";
import { SelectField } from "@/components/ui/form-field/form-field";
import { updatePtoSettingsAction } from "@/features/pto/actions/pto-actions";
import { initialPtoActionState } from "@/features/pto/domain/pto-action-state";

import styles from "./pto.module.css";

const roleLabels = {
  administrator: "Administrador",
  collaborator: "Colaborador",
  supervisor: "Supervisor",
} as const;

export function PtoSettingsForm({
  options,
  selectedId,
}: {
  options: Array<{
    displayName: string;
    id: string;
    role: keyof typeof roleLabels;
  }>;
  selectedId: string | null;
}) {
  const [state, action] = useActionState(
    updatePtoSettingsAction,
    initialPtoActionState,
  );
  return (
    <form action={action} className={styles.formCard}>
      <SelectField
        defaultValue={selectedId ?? ""}
        description="Las solicitudes creadas por supervisores se enviarán a esta cuenta."
        id="supervisorApproverPlatformUserId"
        label="Aprobador de supervisores"
        name="supervisorApproverPlatformUserId"
        required
      >
        <option value="">Seleccioná una cuenta activa</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.displayName} · {roleLabels[option.role]}
          </option>
        ))}
      </SelectField>
      {state.message && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}
      <SubmitButton pendingLabel="Guardando…">Guardar configuración</SubmitButton>
    </form>
  );
}
