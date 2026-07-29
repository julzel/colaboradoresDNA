import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import styles from "./employee-management.module.css";

type EmployeeDetailItemProps = {
  children: ReactNode;
  icon: LucideIcon;
  label: string;
};

export function EmployeeDetailItem({
  children,
  icon: Icon,
  label,
}: EmployeeDetailItemProps) {
  return (
    <div className={styles.detailItem}>
      <dt>
        <span aria-hidden="true" className={styles.detailItemIcon}>
          <Icon size={22} strokeWidth={2} />
        </span>
        <span className={styles.detailItemLabel}>{label}</span>
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
