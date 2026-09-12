"use client";

import {
  forwardRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
} from "react";
import { Upload } from "lucide-react";

import styles from "./file-upload.module.css";

type FileUploadProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  description?: string;
  emptyText?: string;
  label: string;
  selectText?: string;
};

export const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>(
  function FileUpload(
    {
      className = "",
      description,
      emptyText = "Ningún archivo seleccionado",
      id,
      label,
      onChange,
      selectText = "Seleccionar archivo",
      ...props
    },
    ref,
  ) {
    const [fileName, setFileName] = useState("");

    function handleChange(event: ChangeEvent<HTMLInputElement>) {
      setFileName(event.target.files?.[0]?.name ?? "");
      onChange?.(event);
    }

    const descriptionId = description && id ? `${id}-description` : undefined;

    return (
      <div className={`${styles.field} ${className}`.trim()}>
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
        <input
          {...props}
          aria-describedby={descriptionId}
          className={styles.input}
          id={id}
          onChange={handleChange}
          ref={ref}
          type="file"
        />
        <label className={styles.picker} htmlFor={id}>
          <span className={styles.icon} aria-hidden="true">
            <Upload size={20} strokeWidth={2} />
          </span>
          <span className={styles.content}>
            <span className={styles.action}>{selectText}</span>
            <span className={fileName ? styles.fileName : styles.empty}>
              {fileName || emptyText}
            </span>
          </span>
        </label>
        {description && (
          <p className={styles.description} id={descriptionId}>
            {description}
          </p>
        )}
      </div>
    );
  },
);
