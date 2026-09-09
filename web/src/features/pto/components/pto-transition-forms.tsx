"use client";

import { useActionState, useState } from "react";

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
import { LeaveConflictWarning } from "./leave-conflict-warning";

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

export function PtoSubmitForm({ requestId }: { requestId: string }) {
  const [state, action] = useActionState(submitPtoRequestAction, initialPtoActionState);
  return (
    <form action={action} className={styles.formCard}>
      <input name="requestId" type="hidden" value={requestId} />
      {state.requiresConfirmation && (
        <input name="confirmWarnings" type="hidden" value="true" />
      )}
      <Feedback message={state.message} warning={state.status === "warning"} />
      <LeaveConflictWarning conflicts={state.conflicts ?? []} />
      <SubmitButton pendingLabel="Enviando…">
        {state.requiresConfirmation ? "Enviar de todos modos" : "Enviar solicitud"}
      </SubmitButton>
    </form>
  );
}

export function PtoCancelForm({
  requestId,
  noteRequired = false,
}: {
  requestId: string;
  noteRequired?: boolean;
}) {
  const [state, action] = useActionState(cancelPtoRequestAction, initialPtoActionState);
  return (
    <form action={action} className={`${styles.actions} ${styles.cancelPtoForm}`}>
      <input name="requestId" type="hidden" value={requestId} />
      <Feedback message={state.message} />
      {noteRequired && (
        <TextAreaField
          id="cancellationNote"
          name="cancellationNote"
          label="Motivo de cancelación"
          description="El colaborador recibirá una notificación."
          required
          minLength={3}
          maxLength={1000}
        />
      )}
      <SubmitButton pendingLabel="Cancelando…" variant="danger">
        Cancelar solicitud
      </SubmitButton>
    </form>
  );
}

export function PtoDecisionForm({ requestId }: { requestId: string }) {
  const [state, action] = useActionState(decidePtoRequestAction, initialPtoActionState);
  const [note, setNote] = useState("");
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
        value={note}
        onChange={(event) => setNote(event.target.value)}
        optional
        rows={4}
      />
      <Feedback message={state.message} warning={state.status === "warning"} />
      <LeaveConflictWarning conflicts={state.conflicts ?? []} />
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
