import { Construction } from "lucide-react";

import styles from "./construction-placeholder.module.css";

type ConstructionPlaceholderProps = {
  description: string;
  eyebrow: string;
  title: string;
};

export function ConstructionPlaceholder({
  description,
  eyebrow,
  title,
}: ConstructionPlaceholderProps) {
  return (
    <section className={styles.placeholder} aria-labelledby="page-title">
      <Construction aria-hidden="true" className={styles.icon} size={36} />
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h1 id="page-title">{title}</h1>
      <p>{description}</p>
    </section>
  );
}
