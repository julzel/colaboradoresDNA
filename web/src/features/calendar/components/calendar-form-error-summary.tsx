"use client";

import { useEffect, useRef } from "react";

import type { CalendarActionState } from "@/features/calendar/domain/calendar-action-state";

import styles from "./calendar.module.css";

type CalendarFormErrorSummaryProps = {
  state: CalendarActionState;
};

export function CalendarFormErrorSummary({ state }: CalendarFormErrorSummaryProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === "error") ref.current?.focus();
  }, [state]);

  if (state.status !== "error") return null;

  return (
    <div className={styles.errorSummary} ref={ref} role="alert" tabIndex={-1}>
      <strong>No pudimos guardar el evento.</strong>
      <p className={styles.errorSummaryMessage}>{state.message}</p>
    </div>
  );
}
