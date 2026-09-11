"use client";

import { useState, type ComponentProps } from "react";
import { SelectField, TextField } from "@/components/ui/form-field/form-field";
import { normalizeProductionLookup } from "../domain/shared";
import type { ProductionImportPreviewResult } from "../application/production-task-contracts";
import styles from "./tasks.module.css";

type Props = Omit<ComponentProps<typeof SelectField>, "children"> & {
  employees: ProductionImportPreviewResult["employees"];
};

export function TaskAssigneeField({ employees, ...props }: Props) {
  const [search, setSearch] = useState("");
  const words = normalizeProductionLookup(search).split(/\s+/).filter(Boolean);
  const matches = employees.filter((employee) => {
    const text = normalizeProductionLookup(
      `${employee.displayName} ${employee.employeeCode ?? ""}`,
    );
    return words.every((word) => text.includes(word));
  });
  // Keep the chosen identity visible even when the search changes.
  const options = employees.filter(
    (employee) => employee.id === props.value || matches.includes(employee),
  );
  return (
    <div className={styles.mapping}>
      <TextField
        id={`${props.id}-search`}
        label={`Buscar por nombre · ${props.label}`}
        type="search"
        autoComplete="off"
        placeholder="Nombre, apellido o código"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <SelectField {...props}>
        <option value="">Identificá a esta persona</option>
        {options.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.displayName} · {employee.employeeCode ?? "Sin código"}
          </option>
        ))}
      </SelectField>
      <p className={styles.muted} role="status">
        {matches.length
          ? `${matches.length} coincidencias`
          : "No encontramos colaboradores. Probá con otro nombre o apellido."}
      </p>
    </div>
  );
}
