"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/ui/feedback/submit-button";
import { revealEmployeeIdentificationAction } from "@/features/employees/actions/employee-actions";
import { initialIdentificationRevealState } from "@/features/employees/domain/employee-action-state";

type IdentificationRevealProps = {
  employeeId: string;
  maskedValue: string;
};

export function IdentificationReveal({
  employeeId,
  maskedValue,
}: IdentificationRevealProps) {
  const [state, action] = useActionState(
    revealEmployeeIdentificationAction,
    initialIdentificationRevealState,
  );

  return (
    <div>
      <span>{state.status === "success" ? state.value : maskedValue}</span>
      {state.status !== "success" && (
        <form action={action}>
          <input name="employeeId" type="hidden" value={employeeId} />
          <SubmitButton pendingLabel="Mostrando…" size="small" variant="quiet">
            Mostrar todo
          </SubmitButton>
        </form>
      )}
      {state.status === "error" && (
        <p role="alert">No fue posible mostrar la identificación.</p>
      )}
    </div>
  );
}
