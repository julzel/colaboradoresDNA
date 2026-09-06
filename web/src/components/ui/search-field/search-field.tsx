import { Search } from "lucide-react";

import { TextField, type TextFieldProps } from "@/components/ui/form-field/form-field";

import styles from "./search-field.module.css";

type SearchFieldProps = Omit<TextFieldProps, "type" | "visuallyHiddenLabel">;

export function SearchField({ className = "", ...props }: SearchFieldProps) {
  return (
    <div className={`${styles.root} ${className}`.trim()}>
      <Search aria-hidden="true" className={styles.icon} size={19} />
      <TextField
        {...props}
        className={styles.input}
        type="search"
        visuallyHiddenLabel
      />
    </div>
  );
}
