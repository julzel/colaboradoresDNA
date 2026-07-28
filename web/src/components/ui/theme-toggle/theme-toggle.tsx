import styles from "./theme-toggle.module.css";

export function ThemeToggle() {
  return (
    <div className={styles.toggle} role="group" aria-label="Color theme">
      <button
        aria-pressed="false"
        className={styles.option}
        data-theme-option="light"
        suppressHydrationWarning
        type="button"
      >
        Light
      </button>
      <button
        aria-pressed="false"
        className={styles.option}
        data-theme-option="dark"
        suppressHydrationWarning
        type="button"
      >
        Dark
      </button>
    </div>
  );
}
