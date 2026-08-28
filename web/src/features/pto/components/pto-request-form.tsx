"use client";

import { useActionState, useState } from "react";

import { ButtonLink } from "@/components/ui/button/button";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { SubmitButton } from "@/components/ui/feedback/submit-button";
import {
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/ui/form-field/form-field";
import {
  saveEmployeePtoDraftAction,
  savePtoDraftAction,
} from "@/features/pto/actions/pto-actions";
import {
  formatPtoDays,
  ptoCategoryLabels,
  type PtoCategory,
} from "@/features/pto/domain/pto";
import { initialPtoActionState } from "@/features/pto/domain/pto-action-state";

import { PtoCategoryBadge } from "./pto-category-badge";
import styles from "./pto.module.css";

type EditablePtoRequest = {
  category: PtoCategory;
  collaboratorNote: string | null;
  durationUnits: number;
  endDate: string;
  id: string;
  startDate: string;
};

export function PtoRequestForm({
  employeeId,
  request,
}: {
  employeeId?: string;
  request?: EditablePtoRequest;
}) {
  const saveAction = employeeId ? saveEmployeePtoDraftAction : savePtoDraftAction;
  const [state, action] = useActionState(saveAction, initialPtoActionState);
  const [selectedCategory, setSelectedCategory] = useState<PtoCategory>(
    request?.category ?? "vacation",
  );
  const cancelHref = employeeId
    ? request
      ? `/ausencias/${request.id}`
      : `/admin/colaboradores/${employeeId}/ausencias`
    : request
      ? `/ausencias/${request.id}`
      : "/ausencias";
  return (
    <ElevatedSurface action={action} as="form" className={styles.formCard}>
      {employeeId && <input name="employeeId" type="hidden" value={employeeId} />}
      {request && <input name="requestId" type="hidden" value={request.id} />}
      {state.message && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}
      <div className={styles.formGrid}>
        <TextField
          defaultValue={request?.startDate}
          error={state.errors?.startDate}
          id="startDate"
          label="Fecha inicial"
          name="startDate"
          required
          type="date"
        />
        <TextField
          defaultValue={request?.endDate}
          error={state.errors?.endDate}
          id="endDate"
          label="Fecha final"
          name="endDate"
          required
          type="date"
        />
        <TextField
          defaultValue={request ? formatPtoDays(request.durationUnits) : "1"}
          error={state.errors?.durationDays}
          id="durationDays"
          label="Duración (días)"
          min="0.5"
          name="durationDays"
          required
          step="0.5"
          type="number"
        />
        <div className={styles.categoryField}>
          <SelectField
            defaultValue={selectedCategory}
            description="Solo Vacaciones descuenta del saldo disponible."
            error={state.errors?.category}
            id="category"
            label="Categoría"
            name="category"
            onChange={(event) =>
              setSelectedCategory(event.currentTarget.value as PtoCategory)
            }
            required
          >
            {(Object.entries(ptoCategoryLabels) as Array<[PtoCategory, string]>).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </SelectField>
          <PtoCategoryBadge category={selectedCategory} />
        </div>
        <div className={styles.fullWidth}>
          <TextAreaField
            defaultValue={request?.collaboratorNote ?? ""}
            error={state.errors?.collaboratorNote}
            id="collaboratorNote"
            label="Nota"
            maxLength={1000}
            name="collaboratorNote"
            optional
            rows={5}
          />
        </div>
      </div>
      <div className={styles.actions}>
        <SubmitButton pendingLabel="Guardando…">
          {employeeId && !request ? "Crear solicitud" : "Guardar borrador"}
        </SubmitButton>
        <ButtonLink href={cancelHref} variant="quiet">
          Cancelar
        </ButtonLink>
      </div>
    </ElevatedSurface>
  );
}
