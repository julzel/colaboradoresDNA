import styles from "./progress-bar.module.css";

type ProgressBarProps = {
  className?: string;
  label: string;
  max?: number;
  value?: number;
};

export function ProgressBar({
  className = "",
  label,
  max = 100,
  value,
}: ProgressBarProps) {
  const safeMax = max > 0 ? max : 100;
  const normalizedValue =
    value === undefined ? undefined : Math.min(Math.max(value, 0), safeMax);
  const percentage =
    normalizedValue === undefined ? undefined : (normalizedValue / safeMax) * 100;

  return (
    <div className={[styles.root, className].filter(Boolean).join(" ")}>
      <div className={styles.labelRow}>
        <span>{label}</span>
        {percentage !== undefined && <span>{Math.round(percentage)}%</span>}
      </div>
      <div
        aria-label={label}
        aria-valuemax={safeMax}
        aria-valuemin={0}
        aria-valuenow={normalizedValue}
        className={styles.track}
        role="progressbar"
      >
        <span
          className={[
            styles.value,
            percentage === undefined ? styles.indeterminate : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={percentage === undefined ? undefined : { width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
