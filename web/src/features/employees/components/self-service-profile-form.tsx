"use client";

import { useState } from "react";
import { PenLine } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button/button";
import { SubmitButton } from "@/components/ui/feedback/submit-button";
import { CheckboxField, TextField } from "@/components/ui/form-field/form-field";
import { updateOwnProfileAction } from "@/features/employees/actions/profile-actions";
import { initialProfileActionState } from "@/features/employees/domain/profile-action-state";

import styles from "./self-service-profile.module.css";

type SelfServiceProfileFormProps = {
  canonicalDisplayName: string;
  phoneDisplayValue: string | null;
  preferredName: string | null;
  shareBirthdayOnCalendar: boolean;
};

export function SelfServiceProfileForm({
  canonicalDisplayName,
  phoneDisplayValue,
  preferredName,
  shareBirthdayOnCalendar,
}: SelfServiceProfileFormProps) {
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState(initialProfileActionState);
  const router = useRouter();

  async function action(formData: FormData) {
    const result = await updateOwnProfileAction(initialProfileActionState, formData);
    setState(result);
    if (result.status === "success") {
      setEditing(false);
      router.refresh();
    }
  }

  if (!editing) {
    return (
      <div className={styles.preferencesView}>
        <dl className={styles.preferenceList}>
          <div>
            <dt>Nombre preferido</dt>
            <dd>{preferredName ?? canonicalDisplayName}</dd>
          </div>
          <div>
            <dt>Teléfono</dt>
            <dd>{phoneDisplayValue ?? "No indicado"}</dd>
          </div>
          <div>
            <dt>Cumpleaños en el calendario</dt>
            <dd>{shareBirthdayOnCalendar ? "Visible" : "Oculto"}</dd>
          </div>
        </dl>
        {state.status === "success" && (
          <p className={styles.successMessage} role="status">
            {state.message}
          </p>
        )}
        <Button onClick={() => setEditing(true)} variant="secondary">
          <PenLine aria-hidden="true" size={18} /> Editar preferencias
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className={styles.preferencesForm}>
      {state.status === "error" && (
        <p className={styles.errorMessage} role="alert">
          {state.message}
        </p>
      )}
      <TextField
        defaultValue={preferredName ?? ""}
        description="Se usa en espacios sociales de la aplicación. No cambia tu nombre legal."
        error={state.errors?.preferredName}
        id="preferredName"
        label="Nombre preferido"
        maxLength={60}
        name="preferredName"
        optional
      />
      <TextField
        autoComplete="tel"
        defaultValue={phoneDisplayValue ?? ""}
        error={state.errors?.phoneNumber}
        id="phoneNumber"
        inputMode="tel"
        label="Número de teléfono"
        name="phoneNumber"
        optional
      />
      <CheckboxField
        defaultChecked={shareBirthdayOnCalendar}
        description="Las personas administradoras siempre pueden consultar la fecha registrada."
        id="shareBirthdayOnCalendar"
        label="Mostrar mi cumpleaños en el calendario compartido"
        name="shareBirthdayOnCalendar"
      />
      <div className={styles.formActions}>
        <SubmitButton pendingLabel="Guardando…">Guardar cambios</SubmitButton>
        <Button onClick={() => setEditing(false)} type="button" variant="quiet">
          Cancelar
        </Button>
      </div>
    </form>
  );
}
