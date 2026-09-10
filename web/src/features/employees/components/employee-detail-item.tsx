import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import styles from "./employee-management.module.css";

type EmployeeDetailItemProps = {
  children: ReactNode;
  icon: LucideIcon;
  label: string;
  truncate?: boolean;
};

export function EmployeeDetailItem({
  children,
  icon: Icon,
  label,
  truncate = false,
}: EmployeeDetailItemProps) {
  const title = truncate && typeof children === "string" ? children : undefined;

  return (
    <div className={styles.detailItem}>
      <dt>
        <span aria-hidden="true" className={styles.detailItemIcon}>
          <Icon size={22} strokeWidth={2} />
        </span>
        <span className={styles.detailItemLabel}>{label}</span>
      </dt>
      <dd
        className={truncate ? styles.detailItemValueTruncated : undefined}
        title={title}
      >
        {children}
      </dd>
    </div>
  );
}
