import { LoaderCircle } from "lucide-react";

import styles from "./spinner.module.css";

type SpinnerProps = {
  className?: string;
  label?: string;
  size?: "small" | "medium" | "large";
};

export function Spinner({ className = "", label, size = "medium" }: SpinnerProps) {
  return (
    <span
      aria-hidden={label ? undefined : "true"}
      aria-label={label}
      className={[styles.spinner, styles[size], className].filter(Boolean).join(" ")}
      role={label ? "status" : undefined}
    >
      <LoaderCircle aria-hidden="true" />
    </span>
  );
}
