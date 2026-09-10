import type { ComponentPropsWithRef } from "react";

import fieldStyles from "./form-field.module.css";
import styles from "./select.module.css";

/** Native form behavior with a themed picker in browsers supporting base-select. */
export function Select({
  className = "",
  children,
  ...props
}: ComponentPropsWithRef<"select">) {
  return (
    <select
      className={`${fieldStyles.control} ${styles.select} ${className}`.trim()}
      {...props}
    >
      {children}
    </select>
  );
}
