import styles from "./theme-toggle.module.css";

export function ThemeToggle() {
  return (
    <div className={styles.toggle} role="group" aria-label="Tema de color">
      <button
        aria-pressed="false"
        className={styles.option}
        data-theme-option="light"
        suppressHydrationWarning
        type="button"
      >
        Claro
      </button>
      <button
        aria-pressed="false"
        className={styles.option}
        data-theme-option="dark"
        suppressHydrationWarning
        type="button"
      >
        Oscuro
      </button>
    </div>
  );
}
