"use client";

import { useActionState, useState } from "react";

import { SubmitButton } from "@/components/ui/feedback/submit-button";
import {
  CheckboxField,
  TextAreaField,
  TextField,
} from "@/components/ui/form-field/form-field";
import {
  adjustPtoBalanceAction,
  openPtoBalanceAction,
} from "@/features/pto/actions/pto-actions";
import { initialPtoActionState } from "@/features/pto/domain/pto-action-state";
import { formatPtoDays } from "@/features/pto/domain/pto";

import styles from "./pto.module.css";

function Message({ message }: { message: string | undefined }) {
  return message ? (
    <p className={styles.error} role="alert">
      {message}
    </p>
  ) : null;
}

export function PtoOpeningBalanceForm({ employeeId }: { employeeId: string }) {
  const [state, action] = useActionState(openPtoBalanceAction, initialPtoActionState);
  return (
    <form action={action} className={styles.formCard}>
      <input name="employeeId" type="hidden" value={employeeId} />
      <TextField
        defaultValue="0"
        description="Puede ser cero o negativo. Usá incrementos de medio día."
        id="openingBalanceDays"
        label="Saldo inicial (días)"
        name="openingBalanceDays"
        required
        step="0.5"
        type="number"
      />
      <Message message={state.message} />
      <SubmitButton pendingLabel="Registrando…">Registrar saldo inicial</SubmitButton>
    </form>
  );
}

export function PtoBalanceAdjustmentForm({
  currentBalanceUnits,
  employeeId,
  employeeName,
}: {
  currentBalanceUnits: number;
  employeeId: string;
  employeeName: string;
}) {
  const [state, action] = useActionState(adjustPtoBalanceAction, initialPtoActionState);
  const [adjustmentDays, setAdjustmentDays] = useState("");
  const adjustment = Number(adjustmentDays);
  const isValidAdjustment =
    Number.isFinite(adjustment) && adjustment !== 0 && Number.isInteger(adjustment * 2);
  const projectedUnits = isValidAdjustment
    ? currentBalanceUnits + Math.round(adjustment * 2)
    : currentBalanceUnits;
  return (
    <form action={action} className={styles.formCard}>
      <input name="employeeId" type="hidden" value={employeeId} />
      <TextField
        description="Usá un valor positivo para sumar o negativo para restar."
        id="adjustmentDays"
        label="Ajuste (días)"
        name="adjustmentDays"
        onChange={(event) => setAdjustmentDays(event.currentTarget.value)}
        required
        step="0.5"
        type="number"
      />
      {adjustmentDays && isValidAdjustment && (
        <div className={styles.warning} role="status">
          <strong>Confirmación para {employeeName}</strong>
          <p>
            {formatPtoDays(currentBalanceUnits)} días {adjustment >= 0 ? "+" : "−"}{" "}
            {formatPtoDays(Math.abs(Math.round(adjustment * 2)))} días ={" "}
            {formatPtoDays(projectedUnits)} días.
          </p>
          <CheckboxField
            id="confirmAdjustment"
            label="Confirmo este ajuste y su resultado"
            name="confirmAdjustment"
            required
            value="true"
          />
        </div>
      )}
      <TextAreaField
        id="reason"
        label="Motivo"
        maxLength={500}
        name="reason"
        required
        rows={3}
      />
      <Message message={state.message} />
      <SubmitButton pendingLabel="Aplicando…">Aplicar ajuste</SubmitButton>
    </form>
  );
}
