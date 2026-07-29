import Link from "next/link";

import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import type { EmployeeDirectoryItem } from "@/features/employees/server/employee-read-repository";

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
};

export function EmployeeDirectoryTable({ items }: EmployeeDirectoryTableProps) {
  return (
    <ElevatedSurface className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Colaborador</th>
            <th scope="col">Departamento</th>
            <th scope="col">Puesto</th>
            <th scope="col">Jefatura</th>
            <th scope="col">Rol</th>
            <th scope="col">Estado laboral</th>
            <th scope="col">Acceso</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <Link
                  className={styles.nameLink}
                  href={`/admin/colaboradores/${item.id}`}
                >
                  {item.displayName}
                </Link>
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
    </ElevatedSurface>
  );
}
