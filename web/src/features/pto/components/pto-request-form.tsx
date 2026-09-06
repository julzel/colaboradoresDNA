"use client";

import { useActionState, useRef, useState, type FormEvent } from "react";

import { Button, ButtonLink } from "@/components/ui/button/button";
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

import styles from "./pto.module.css";

type EditablePtoRequest = {
  category: PtoCategory;
  collaboratorNote: string | null;
  durationUnits: number;
  endDate: string;
  id: string;
  startDate: string;
};

export type PtoCollaboratorOption = {
  displayName: string;
  id: string;
};

export function PtoRequestForm({
  collaborators,
  employeeId,
  onCancel,
  presentation = "page",
  request,
}: {
  collaborators?: PtoCollaboratorOption[];
  employeeId?: string;
  onCancel?: () => void;
  presentation?: "modal" | "page";
  request?: EditablePtoRequest;
}) {
  const isAdministratorRequest = Boolean(employeeId || collaborators);
  const isAdministratorCreation = isAdministratorRequest && !request;
  const saveAction = isAdministratorRequest
    ? saveEmployeePtoDraftAction
    : savePtoDraftAction;
  const [state, action] = useActionState(saveAction, initialPtoActionState);
  const confirmationInputRef = useRef<HTMLInputElement>(null);
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!isAdministratorCreation) return;

    const selectedEmployeeId = new FormData(event.currentTarget).get("employeeId");
    const collaboratorName = collaborators?.find(
      (collaborator) => collaborator.id === selectedEmployeeId,
    )?.displayName;
    const confirmed = window.confirm(
      `La ausencia${collaboratorName ? ` de ${collaboratorName}` : ""} se aprobará inmediatamente y actualizará su saldo cuando corresponda. ¿Querés continuar?`,
    );

    if (!confirmed) {
      event.preventDefault();
      return;
    }
    if (confirmationInputRef.current) confirmationInputRef.current.value = "true";
  }

  return (
    <ElevatedSurface
      action={action}
      as="form"
      className={styles.formCard}
      data-presentation={presentation}
      onSubmit={handleSubmit}
    >
      {employeeId && <input name="employeeId" type="hidden" value={employeeId} />}
      {isAdministratorCreation && (
        <input
          name="confirmImmediateApproval"
          ref={confirmationInputRef}
          type="hidden"
          value="false"
        />
      )}
      {request && <input name="requestId" type="hidden" value={request.id} />}
      {state.message && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}
      <div className={styles.formGrid}>
        {collaborators && (
          <div className={styles.fullWidth}>
            <SelectField
              defaultValue=""
              error={state.errors?.employeeId}
              id="employeeId"
              label="Colaborador"
              name="employeeId"
              required
            >
              <option disabled value="">
                Seleccioná un colaborador
              </option>
              {collaborators.map((collaborator) => (
                <option key={collaborator.id} value={collaborator.id}>
                  {collaborator.displayName}
                </option>
              ))}
            </SelectField>
          </div>
        )}
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
          {isAdministratorCreation ? "Crear y aprobar" : "Guardar borrador"}
        </SubmitButton>
        {onCancel ? (
          <Button onClick={onCancel} variant="quiet">
            Cancelar
          </Button>
        ) : (
          <ButtonLink href={cancelHref} variant="quiet">
            Cancelar
          </ButtonLink>
        )}
      </div>
    </ElevatedSurface>
  );
}
