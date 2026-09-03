import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import styles from "./page-section-header.module.css";

type PageSectionHeaderProps = {
  action?: ReactNode;
  eyebrow?: string;
  icon: LucideIcon;
  title: string;
  titleId?: string;
};

export function PageSectionHeader({
  action,
  eyebrow,
  icon: Icon,
  title,
  titleId,
}: PageSectionHeaderProps) {
  return (
    <div className={styles.header}>
      <span aria-hidden="true" className={styles.icon}>
        <Icon size={24} strokeWidth={1.8} />
      </span>
      <div className={styles.copy}>
        {eyebrow && <p className={`eyebrow ${styles.eyebrow}`}>{eyebrow}</p>}
        <h1 id={titleId}>{title}</h1>
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
