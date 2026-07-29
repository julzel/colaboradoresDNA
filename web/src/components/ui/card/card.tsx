import type { HTMLAttributes, ReactNode } from "react";

import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";

import styles from "./card.module.css";

type CardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

type CardHeaderProps = {
  action?: ReactNode;
  description?: string;
  title: string;
};

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <ElevatedSurface
      as="section"
      className={`${styles.card} ${className}`.trim()}
      {...props}
    >
      {children}
    </ElevatedSurface>
  );
}

export function CardHeader({ action, description, title }: CardHeaderProps) {
  return (
    <header className={styles.header}>
      <div>
        <h2 className={styles.title}>{title}</h2>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {action}
    </header>
  );
}

type CardBodyProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function CardBody({ children, className = "", ...props }: CardBodyProps) {
  return (
    <div className={`${styles.body} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
