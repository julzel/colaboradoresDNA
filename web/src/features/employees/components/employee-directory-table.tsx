import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import type { EmployeeDirectoryItem } from "@/features/employees/view-models/employee-view";

import { EmployeeDirectoryAvatar } from "./employee-directory-avatar";
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

type EmployeeDirectoryTableProps = {
  items: EmployeeDirectoryItem[];
  onSort: (key: EmployeeDirectorySortKey) => void;
  sortDirection: EmployeeDirectorySortDirection;
  sortKey: EmployeeDirectorySortKey;
};

export type EmployeeDirectorySortDirection = "ascending" | "descending";

export type EmployeeDirectorySortKey =
  | "access"
  | "department"
  | "employment"
  | "manager"
  | "name"
  | "position"
  | "role";

const columns: Array<{ key: EmployeeDirectorySortKey; label: string }> = [
  { key: "name", label: "Colaborador" },
  { key: "department", label: "Departamento" },
  { key: "position", label: "Puesto" },
  { key: "manager", label: "Jefatura" },
  { key: "role", label: "Rol" },
  { key: "employment", label: "Estado laboral" },
  { key: "access", label: "Acceso" },
];

export function EmployeeDirectoryTable({
  items,
  onSort,
  sortDirection,
  sortKey,
}: EmployeeDirectoryTableProps) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((column) => {
              const isCurrent = sortKey === column.key;
              const SortIcon = sortDirection === "ascending" ? ChevronUp : ChevronDown;

              return (
                <th
                  aria-sort={isCurrent ? sortDirection : "none"}
                  key={column.key}
                  scope="col"
                >
                  <button
                    className={styles.sortButton}
                    onClick={() => onSort(column.key)}
                    type="button"
                  >
                    {column.label}
                    {isCurrent && <SortIcon aria-hidden="true" size={16} />}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <div className={styles.employeeIdentityWithAvatar}>
                  <EmployeeDirectoryAvatar
                    displayName={item.displayName}
                    profileImageUrl={item.profileImageUrl}
                  />
                  <span className={styles.employeeIdentity}>
                    <Link
                      className={styles.nameLink}
                      href={`/admin/colaboradores/${item.id}`}
                    >
                      {item.displayName}
                    </Link>
                    <small>{item.employeeCode ?? "Código pendiente"}</small>
                  </span>
                </div>
              </td>
              <td>{item.departmentName ?? "Sin asignar"}</td>
              <td>{item.positionTitle ?? "Sin asignar"}</td>
              <td>{item.managerName ?? "Sin asignar"}</td>
              <td>{roleLabels[item.platformRole]}</td>
              <td>
                <StatusBadge
                  tone={item.employmentStatus === "active" ? "success" : "neutral"}
                >
                  {item.employmentStatus === "active" ? "Activo" : "Inactivo"}
                </StatusBadge>
              </td>
              <td>
                <StatusBadge
                  tone={
                    item.accessStatus === "active"
                      ? "success"
                      : item.accessStatus === "invited"
                        ? "warning"
                        : "danger"
                  }
                >
                  {accessLabels[item.accessStatus]}
                </StatusBadge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
