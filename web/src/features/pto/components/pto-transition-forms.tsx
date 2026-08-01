"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/ui/feedback/submit-button";
import { SelectField, TextAreaField } from "@/components/ui/form-field/form-field";
import {
  cancelPtoRequestAction,
  decidePtoRequestAction,
  reassignPtoApproverAction,
  submitPtoRequestAction,
} from "@/features/pto/actions/pto-actions";
import { initialPtoActionState } from "@/features/pto/domain/pto-action-state";

import styles from "./pto.module.css";

type AdministratorOption = { displayName: string; id: string };

function Feedback({
  message,
  warning,
}: {
  message: string | undefined;
  warning?: boolean;
}) {
  if (!message) return null;
  return (
    <p className={warning ? styles.warning : styles.error} role="alert">
      {message}
    </p>
  );
}

export function PtoSubmitForm({
  administratorOptions,
  requestId,
}: {
  administratorOptions: AdministratorOption[];
  requestId: string;
}) {
  const [state, action] = useActionState(submitPtoRequestAction, initialPtoActionState);
  return (
    <form action={action} className={styles.formCard}>
      <input name="requestId" type="hidden" value={requestId} />
      {state.requiresConfirmation && (
        <input name="confirmWarnings" type="hidden" value="true" />
      )}
      {administratorOptions.length > 0 && (
        <SelectField
          id="administratorApproverId"
          label="Persona aprobadora"
          name="administratorApproverId"
          required
        >
          <option value="">Seleccioná otra persona administradora</option>
          {administratorOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.displayName}
            </option>
          ))}
        </SelectField>
      )}
      <Feedback message={state.message} warning={state.status === "warning"} />
      <SubmitButton pendingLabel="Enviando…">
        {state.requiresConfirmation ? "Enviar de todos modos" : "Enviar solicitud"}
      </SubmitButton>
    </form>
  );
}

export function PtoCancelForm({ requestId }: { requestId: string }) {
  const [state, action] = useActionState(cancelPtoRequestAction, initialPtoActionState);
  return (
    <form action={action} className={styles.actions}>
      <input name="requestId" type="hidden" value={requestId} />
      <Feedback message={state.message} />
      <SubmitButton pendingLabel="Cancelando…" variant="danger">
        Cancelar solicitud
      </SubmitButton>
    </form>
  );
}

export function PtoDecisionForm({ requestId }: { requestId: string }) {
  const [state, action] = useActionState(decidePtoRequestAction, initialPtoActionState);
  return (
    <form action={action} className={styles.formCard}>
      <input name="requestId" type="hidden" value={requestId} />
      {state.requiresConfirmation && (
        <input name="confirmWarnings" type="hidden" value="true" />
      )}
      <TextAreaField
        id="decisionNote"
        label="Nota de decisión"
        maxLength={1000}
        name="decisionNote"
        optional
        rows={4}
      />
      <Feedback message={state.message} warning={state.status === "warning"} />
      <div className={styles.actions}>
        <SubmitButton name="decision" pendingLabel="Guardando…" value="approved">
          {state.requiresConfirmation ? "Aprobar de todos modos" : "Aprobar"}
        </SubmitButton>
        <SubmitButton
          name="decision"
          pendingLabel="Guardando…"
          value="denied"
          variant="danger"
        >
          Denegar
        </SubmitButton>
      </div>
    </form>
  );
}

export function PtoReassignmentForm({
  options,
  requestId,
}: {
  options: AdministratorOption[];
  requestId: string;
}) {
  const [state, action] = useActionState(
    reassignPtoApproverAction,
    initialPtoActionState,
  );
  return (
    <form action={action} className={styles.formCard}>
      <input name="requestId" type="hidden" value={requestId} />
      <SelectField
        id="approverPlatformUserId"
        label="Nueva persona aprobadora"
        name="approverPlatformUserId"
        required
      >
        <option value="">Seleccioná una cuenta elegible</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.displayName}
          </option>
        ))}
      </SelectField>
      <Feedback message={state.message} />
      <SubmitButton disabled={!options.length} pendingLabel="Reasignando…">
        Reasignar aprobación
      </SubmitButton>
    </form>
  );
}
