import type {
  HTMLAttributes,
  MouseEventHandler,
  ReactNode,
} from "react";
import Link from "next/link";

import styles from "./filter-bar.module.css";

type FilterBarProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "nav";
};

export function FilterBar({
  as: Component = "div",
  className = "",
  ...props
}: FilterBarProps) {
  return <Component className={`${styles.bar} ${className}`.trim()} {...props} />;
}

type FilterChipProps = {
  active: boolean;
  children: ReactNode;
  className?: string;
  count: number;
  href?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

export function FilterChip({
  active,
  children,
  className = "",
  count,
  href,
  onClick,
}: FilterChipProps) {
  const content = (
    <>
      {children}
      <span className={styles.count}>{count}</span>
    </>
  );
  const chipClassName = `${styles.chip} ${className}`.trim();

  if (href) {
    return (
      <Link
        aria-current={active ? "page" : undefined}
        className={chipClassName}
        data-active={active}
        href={href}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      aria-pressed={active}
      className={chipClassName}
      data-active={active}
      onClick={onClick}
      type="button"
    >
      {content}
    </button>
  );
}
