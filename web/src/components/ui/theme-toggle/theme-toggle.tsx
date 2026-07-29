import { Moon, Sun } from "lucide-react";

import styles from "./theme-toggle.module.css";

export function ThemeToggle() {
  return (
    <button
      aria-label="Activar tema oscuro"
      className={styles.button}
      data-current-theme="light"
      data-theme-toggle
      suppressHydrationWarning
      title="Activar tema oscuro"
      type="button"
    >
      <Moon aria-hidden="true" className={styles.moonIcon} size={18} />
      <Sun aria-hidden="true" className={styles.sunIcon} size={18} />
    </button>
  );
}
