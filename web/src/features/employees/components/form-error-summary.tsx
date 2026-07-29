"use client";

import { useEffect, useRef } from "react";

import type { EmployeeActionState } from "@/features/employees/domain/employee-action-state";

import styles from "./employee-management.module.css";

type FormErrorSummaryProps = {
  state: EmployeeActionState;
};

export function FormErrorSummary({ state }: FormErrorSummaryProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === "error") ref.current?.focus();
  }, [state]);

  if (state.status !== "error") return null;

  return (
    <div className={styles.errorSummary} ref={ref} role="alert" tabIndex={-1}>
      <strong>No pudimos guardar los cambios.</strong>
      <p>{state.message}</p>
    </div>
  );
}
