"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import styles from "./form-field.module.css";

export function PasswordInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  const label = visible ? "Ocultar contraseña" : "Mostrar contraseña";
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className={styles.passwordControl}>
      <input
        {...props}
        className={`${className ?? ""} ${styles.passwordInput}`.trim()}
        type={visible ? "text" : "password"}
      />
      <button
        type="button"
        className={styles.passwordToggle}
        aria-label={label}
        aria-controls={props.id}
        title={label}
        disabled={props.disabled}
        onClick={() => setVisible((current) => !current)}
      >
        <Icon size={20} aria-hidden="true" />
      </button>
    </div>
  );
}
