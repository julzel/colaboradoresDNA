import type { StackItem } from "@/features/system/data/stack-items";

import styles from "./stack-card.module.css";

type StackCardProps = {
  index: number;
  item: StackItem;
};

export function StackCard({ index, item }: StackCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.meta}>
        <span>{String(index).padStart(2, "0")}</span>
        <span>{item.label}</span>
      </div>
      <h3>{item.title}</h3>
      <p>{item.description}</p>
      <ul aria-label={`${item.title} capabilities`}>
        {item.capabilities.map((capability) => (
          <li key={capability}>{capability}</li>
        ))}
      </ul>
    </article>
  );
}
