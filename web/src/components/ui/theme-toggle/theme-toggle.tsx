import { Moon, Sun } from "lucide-react";

import styles from "./theme-toggle.module.css";

type Theme = "dark" | "light";

const storageKey = "colaboradores-theme";

function isTheme(value: string | undefined): value is Theme {
  return value === "light" || value === "dark";
}

export function toggleTheme() {
  const root = document.documentElement;
  const currentTheme = isTheme(root.dataset.theme) ? root.dataset.theme : "light";
  const nextTheme = currentTheme === "light" ? "dark" : "light";

  root.dataset.theme = nextTheme;
  root.style.colorScheme = nextTheme;
  window.localStorage.setItem(storageKey, nextTheme);
}

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
