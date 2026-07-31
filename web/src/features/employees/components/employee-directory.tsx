"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { TextField } from "@/components/ui/form-field/form-field";
import type { EmployeeDirectoryItem } from "@/features/employees/server/employee-read-repository";

import { EmployeeDirectoryMobileList } from "./employee-directory-mobile-list";
import {
  EmployeeDirectoryTable,
  type EmployeeDirectorySortDirection,
  type EmployeeDirectorySortKey,
} from "./employee-directory-table";
import styles from "./employee-management.module.css";

const roleLabels = {
  administrator: "Administrador",
  collaborator: "Colaborador",
  supervisor: "Supervisor",
} as const;

const accessLabels = {
  active: "Activo",
  deactivated: "Desactivado",
  invited: "Invitado",
} as const;

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

function displayValue(value: string | null) {
  return value ?? "Sin asignar";
}

function getSortValue(item: EmployeeDirectoryItem, key: EmployeeDirectorySortKey) {
  switch (key) {
    case "access":
      return accessLabels[item.accessStatus];
    case "department":
      return displayValue(item.departmentName);
    case "employment":
      return item.employmentStatus === "active" ? "Activo" : "Inactivo";
    case "manager":
      return displayValue(item.managerName);
    case "name":
      return item.displayName;
    case "position":
      return displayValue(item.positionTitle);
    case "role":
      return roleLabels[item.platformRole];
  }
}

function matchesSearch(item: EmployeeDirectoryItem, normalizedQuery: string) {
  if (!normalizedQuery) return true;

  return normalizeSearchText(
    [
      item.displayName,
      displayValue(item.departmentName),
      displayValue(item.positionTitle),
      displayValue(item.managerName),
      roleLabels[item.platformRole],
      item.employmentStatus === "active" ? "Activo" : "Inactivo",
      accessLabels[item.accessStatus],
    ].join(" "),
  ).includes(normalizedQuery);
}

type EmployeeDirectoryProps = {
  items: EmployeeDirectoryItem[];
};

export function EmployeeDirectory({ items }: EmployeeDirectoryProps) {
  const [search, setSearch] = useState("");
  const [sortDirection, setSortDirection] =
    useState<EmployeeDirectorySortDirection>("ascending");
  const [sortKey, setSortKey] = useState<EmployeeDirectorySortKey>("name");

  const visibleItems = useMemo(() => {
    const normalizedQuery = normalizeSearchText(search.trim());
    const direction = sortDirection === "ascending" ? 1 : -1;

    return items
      .filter((item) => matchesSearch(item, normalizedQuery))
      .toSorted((left, right) => {
        const comparison = getSortValue(left, sortKey).localeCompare(
          getSortValue(right, sortKey),
          "es",
          { numeric: true, sensitivity: "base" },
        );

        if (comparison !== 0) return comparison * direction;
        return left.displayName.localeCompare(right.displayName, "es", {
          sensitivity: "base",
        });
      });
  }, [items, search, sortDirection, sortKey]);

  const handleSort = (nextKey: EmployeeDirectorySortKey) => {
    if (nextKey === sortKey) {
      setSortDirection((current) =>
        current === "ascending" ? "descending" : "ascending",
      );
      return;
    }

    setSortKey(nextKey);
    setSortDirection("ascending");
  };

  return (
    <section aria-label="Directorio de colaboradores" className={styles.directory}>
      <div className={styles.searchBar} role="search">
        <Search aria-hidden="true" className={styles.searchIcon} size={20} />
        <TextField
          autoComplete="off"
          className={styles.searchInput}
          id="employee-directory-search"
          label="Buscar colaboradores"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre, departamento, puesto…"
          type="search"
          value={search}
          visuallyHiddenLabel
        />
      </div>

      <p aria-live="polite" className={styles.muted}>
        {visibleItems.length}{" "}
        {visibleItems.length === 1
          ? "colaborador encontrado"
          : "colaboradores encontrados"}
      </p>

      {visibleItems.length === 0 ? (
        <ElevatedSurface className={styles.empty}>
          <h2>No encontramos colaboradores</h2>
          <p className={styles.muted}>Probá con otro término de búsqueda.</p>
        </ElevatedSurface>
      ) : (
        <>
          <EmployeeDirectoryTable
            items={visibleItems}
            onSort={handleSort}
            sortDirection={sortDirection}
            sortKey={sortKey}
          />
          <EmployeeDirectoryMobileList items={visibleItems} />
        </>
      )}
    </section>
  );
}
