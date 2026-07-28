import type { HTMLAttributes } from "react";

import styles from "./status-badge.module.css";

type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: StatusTone;
};

export function StatusBadge({
  children,
  className = "",
  tone = "neutral",
  ...props
}: StatusBadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[tone]} ${className}`.trim()} {...props}>
      <span className={styles.dot} aria-hidden="true" />
      {children}
    </span>
  );
}
