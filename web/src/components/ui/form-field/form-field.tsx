import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import styles from "./form-field.module.css";

type FieldChromeProps = {
  children: ReactNode;
  description?: string | undefined;
  error?: string | undefined;
  id: string;
  label: string;
  optional?: boolean | undefined;
  visuallyHiddenLabel?: boolean | undefined;
};

function FieldChrome({
  children,
  description,
  error,
  id,
  label,
  optional = false,
  visuallyHiddenLabel = false,
}: FieldChromeProps) {
  return (
    <div className={styles.field}>
      <div className={visuallyHiddenLabel ? "sr-only" : styles.labelRow}>
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
        {optional && <span className={styles.optional}>Opcional</span>}
      </div>
      {children}
      {description && !error && (
        <p className={styles.description} id={`${id}-description`}>
          {description}
        </p>
      )}
      {error && (
        <p className={styles.error} id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function getDescribedBy(
  id: string,
  description: string | undefined,
  error: string | undefined,
) {
  if (error) return `${id}-error`;
  if (description) return `${id}-description`;
  return undefined;
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  description?: string | undefined;
  error?: string | undefined;
  id: string;
  label: string;
  optional?: boolean;
  visuallyHiddenLabel?: boolean;
};

export function TextField({
  className = "",
  description,
  error,
  id,
  label,
  optional,
  visuallyHiddenLabel,
  ...props
}: TextFieldProps) {
  return (
    <FieldChrome
      description={description}
      error={error}
      id={id}
      label={label}
      optional={optional}
      visuallyHiddenLabel={visuallyHiddenLabel}
    >
      <input
        aria-describedby={getDescribedBy(id, description, error)}
        aria-invalid={Boolean(error)}
        className={`${styles.control} ${className}`.trim()}
        id={id}
        {...props}
      />
    </FieldChrome>
  );
}

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  description?: string | undefined;
  error?: string | undefined;
  id: string;
  label: string;
  optional?: boolean;
};

export function SelectField({
  children,
  className = "",
  description,
  error,
  id,
  label,
  optional,
  ...props
}: SelectFieldProps) {
  return (
    <FieldChrome
      description={description}
      error={error}
      id={id}
      label={label}
      optional={optional}
    >
      <select
        aria-describedby={getDescribedBy(id, description, error)}
        aria-invalid={Boolean(error)}
        className={`${styles.control} ${styles.select} ${className}`.trim()}
        id={id}
        {...props}
      >
        {children}
      </select>
    </FieldChrome>
  );
}

type TextAreaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & {
  description?: string | undefined;
  error?: string | undefined;
  id: string;
  label: string;
  optional?: boolean;
};

export function TextAreaField({
  className = "",
  description,
  error,
  id,
  label,
  optional,
  ...props
}: TextAreaFieldProps) {
  return (
    <FieldChrome
      description={description}
      error={error}
      id={id}
      label={label}
      optional={optional}
    >
      <textarea
        aria-describedby={getDescribedBy(id, description, error)}
        aria-invalid={Boolean(error)}
        className={`${styles.control} ${styles.textarea} ${className}`.trim()}
        id={id}
        {...props}
      />
    </FieldChrome>
  );
}

type CheckboxFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type"> & {
  description?: string;
  id: string;
  label: string;
};

export function CheckboxField({
  description,
  id,
  label,
  ...props
}: CheckboxFieldProps) {
  return (
    <div className={styles.checkboxField}>
      <input
        aria-describedby={description ? `${id}-description` : undefined}
        className={styles.checkbox}
        id={id}
        type="checkbox"
        {...props}
      />
      <div>
        <label className={styles.checkboxLabel} htmlFor={id}>
          {label}
        </label>
        {description && (
          <p className={styles.description} id={`${id}-description`}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
