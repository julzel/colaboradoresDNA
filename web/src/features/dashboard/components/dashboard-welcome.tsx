import styles from "./dashboard.module.css";

type DashboardWelcomeProps = {
  date: {
    iso: string;
    label: string;
  };
  displayName: string;
};

export function DashboardWelcome({ date, displayName }: DashboardWelcomeProps) {
  const firstName = displayName.trim().split(/\s+/)[0] || displayName;

  return (
    <header className={styles.welcome}>
      <time dateTime={date.iso}>{date.label}</time>
      <h1>Hola, {firstName}</h1>
      <p>Aquí tienes un resumen de lo más importante para hoy</p>
    </header>
  );
}
