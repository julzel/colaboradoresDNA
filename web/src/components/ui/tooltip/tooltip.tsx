"use client";

import { useId, type ReactNode } from "react";

import styles from "./tooltip.module.css";

type TooltipProps = {
  children: ReactNode;
  content: ReactNode;
  label: string;
};

export function Tooltip({ children, content, label }: TooltipProps) {
  const tooltipId = useId();

  return (
    <span className={styles.wrapper}>
      <button
        aria-describedby={tooltipId}
        aria-label={label}
        className={styles.trigger}
        type="button"
      >
        {children}
      </button>
      <span className={styles.content} id={tooltipId} role="tooltip">
        {content}
      </span>
    </span>
  );
}
