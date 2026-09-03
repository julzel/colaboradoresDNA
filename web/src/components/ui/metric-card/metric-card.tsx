import type { HTMLAttributes, ReactNode } from "react";

import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";

import styles from "./metric-card.module.css";

type MetricCardProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  label: string;
  tone?: "brand" | "warning";
  value: ReactNode;
};

export function MetricCard({
  className = "",
  label,
  tone = "brand",
  value,
  ...props
}: MetricCardProps) {
  return (
    <ElevatedSurface
      className={`${styles.card} ${className}`.trim()}
      data-tone={tone}
      {...props}
    >
      <span className={styles.label}>{label}</span>
      <strong className={styles.value}>{value}</strong>
    </ElevatedSurface>
  );
}
