import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";

import styles from "./employee-management.module.css";

type EmployeeDetailCardProps = {
  action?: ReactNode;
  children: ReactNode;
  icon: LucideIcon;
  title: string;
};

export function EmployeeDetailCard({
  action,
  children,
  icon: Icon,
  title,
}: EmployeeDetailCardProps) {
  return (
    <ElevatedSurface as="section" className={styles.detailCard}>
      <header className={styles.detailCardHeader}>
        <div className={styles.detailCardTitle}>
          <span aria-hidden="true" className={styles.detailCardIcon}>
            <Icon size={24} strokeWidth={2} />
          </span>
          <h2>{title}</h2>
        </div>
        {action && <div className={styles.detailCardAction}>{action}</div>}
      </header>
      <div className={styles.detailCardBody}>{children}</div>
    </ElevatedSurface>
  );
}
