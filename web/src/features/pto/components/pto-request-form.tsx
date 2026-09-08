"use client";

import { startTransition, useActionState, useState } from "react";

import { Button, ButtonLink } from "@/components/ui/button/button";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { SubmitButton } from "@/components/ui/feedback/submit-button";
import {
  CheckboxField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/ui/form-field/form-field";
import {
  saveEmployeePtoDraftAction,
  savePtoDraftAction,
} from "@/features/pto/actions/pto-actions";
import { ptoCategoryLabels, type PtoCategory } from "@/features/pto/domain/pto";
import { initialPtoActionState } from "@/features/pto/domain/pto-action-state";

import styles from "./pto.module.css";

type EditablePtoRequest = {
  category: PtoCategory;
  collaboratorNote: string | null;
  durationUnits: number;
  endDate: string;
  id: string;
  requestedPortion?: "full" | "half";
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
  const [state, action, pending] = useActionState(saveAction, initialPtoActionState);
  const [fields, setFields] = useState({
    employeeId: employeeId ?? "",
    startDate: request?.startDate ?? "",
    endDate: request?.endDate ?? "",
    requestedPortion:
      request?.requestedPortion ?? (request?.durationUnits === 1 ? "half" : "full"),
    category: request?.category ?? "vacation",
    collaboratorNote: request?.collaboratorNote ?? "",
    confirmImmediateApproval: false,
  });
  const cancelHref = employeeId
    ? request
      ? `/ausencias/${request.id}`
      : `/admin/colaboradores/${employeeId}/ausencias`
    : request
      ? `/ausencias/${request.id}`
      : "/ausencias";

  return (
    <ElevatedSurface
      action={action}
      as="form"
      className={styles.formCard}
      data-presentation={presentation}
      // Dispatch explicitly to avoid the automatic native reset on a fulfilled
      // validation-error result. Keep the action for progressive enhancement.
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const formData = new FormData(event.currentTarget as HTMLFormElement);
        startTransition(() => action(formData));
      }}
    >
      {employeeId && <input name="employeeId" type="hidden" value={employeeId} />}
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
              value={fields.employeeId}
              onChange={(event) =>
                setFields({ ...fields, employeeId: event.target.value })
              }
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
          value={fields.startDate}
          onChange={(event) => setFields({ ...fields, startDate: event.target.value })}
          error={state.errors?.startDate}
          id="startDate"
          label="Fecha inicial"
          name="startDate"
          required
          type="date"
        />
        <TextField
          value={fields.endDate}
          min={fields.startDate || undefined}
          onChange={(event) => setFields({ ...fields, endDate: event.target.value })}
          error={state.errors?.endDate}
          id="endDate"
          label="Fecha final"
          name="endDate"
          required
          type="date"
        />
        <SelectField
          value={fields.requestedPortion}
          onChange={(event) =>
            setFields({
              ...fields,
              requestedPortion: event.target.value as "full" | "half",
            })
          }
          error={state.errors?.requestedPortion}
          id="requestedPortion"
          label="Jornada solicitada"
          description="La duración se calcula con el horario asignado. Medio día requiere una sola fecha laboral."
          name="requestedPortion"
          required
        >
          <option value="full">Días completos del rango</option>
          <option value="half">Medio día</option>
        </SelectField>
        <div className={styles.categoryField}>
          <SelectField
            value={fields.category}
            error={state.errors?.category}
            id="category"
            label="Categoría"
            name="category"
            onChange={(event) =>
              setFields({
                ...fields,
                category: event.currentTarget.value as PtoCategory,
              })
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
            value={fields.collaboratorNote}
            onChange={(event) =>
              setFields({ ...fields, collaboratorNote: event.target.value })
            }
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
      {isAdministratorCreation && (
        <CheckboxField
          id="confirmImmediateApproval"
          name="confirmImmediateApproval"
          label="Confirmo que esta ausencia se aprobará inmediatamente"
          description="Si la categoría es Vacaciones, se descontará la duración calculada del saldo del colaborador."
          checked={fields.confirmImmediateApproval}
          onChange={(event) =>
            setFields({ ...fields, confirmImmediateApproval: event.target.checked })
          }
          required
          value="true"
        />
      )}
      <div className={styles.actions}>
        <SubmitButton pending={pending} pendingLabel="Guardando…">
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
