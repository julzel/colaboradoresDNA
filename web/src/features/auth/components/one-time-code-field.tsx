"use client";

import { useState } from "react";

import styles from "./one-time-code-field.module.css";

const codeLength = 6;

type OneTimeCodeFieldProps = {
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
};

export function OneTimeCodeField({
  disabled = false,
  value,
  onChange,
}: OneTimeCodeFieldProps) {
  const [focused, setFocused] = useState(false);
  const digits = Array.from({ length: codeLength }, (_, index) => value[index] ?? "");
  const activeIndex = Math.min(value.length, codeLength - 1);

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor="auth-totp-code">
        Código de 6 dígitos
      </label>
      <p className={styles.description} id="auth-totp-description">
        Abrí tu aplicación de autenticación e ingresá el código que aparece ahí.
      </p>
      <div className={styles.code}>
        <input
          aria-describedby="auth-totp-description"
          aria-label="Código de 6 dígitos"
          autoComplete="one-time-code"
          className={styles.input}
          disabled={disabled}
          id="auth-totp-code"
          inputMode="numeric"
          maxLength={codeLength}
          name="code"
          onBlur={() => setFocused(false)}
          onChange={(event) =>
            onChange(event.currentTarget.value.replace(/\D/g, "").slice(0, codeLength))
          }
          onFocus={() => setFocused(true)}
          pattern="[0-9]{6}"
          required
          type="text"
          value={value}
        />
        <div aria-hidden="true" className={styles.cells}>
          {digits.map((digit, index) => (
            <span
              className={`${styles.cell} ${
                focused && index === activeIndex ? styles.active : ""
              }`}
              key={index}
            >
              {digit}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
