import type { HTMLAttributes } from "react";

import styles from "./list-toolbar.module.css";

export function ListToolbar({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={`${styles.toolbar} ${className}`.trim()} {...props} />;
}
