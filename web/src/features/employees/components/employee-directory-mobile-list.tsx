import Link from "next/link";

import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import type { EmployeeDirectoryItem } from "@/features/employees/view-models/employee-view";

import styles from "./employee-management.module.css";

type EmployeeDirectoryMobileListProps = {
  items: EmployeeDirectoryItem[];
};

export function EmployeeDirectoryMobileList({
  items,
}: EmployeeDirectoryMobileListProps) {
  return (
    <ul className={styles.mobileList}>
      {items.map((item) => (
        <ElevatedSurface as="li" className={styles.mobileItem} key={item.id}>
          <Link className={styles.nameLink} href={`/admin/colaboradores/${item.id}`}>
            {item.displayName}
          </Link>
          <span>{item.departmentName ?? "Sin asignar"}</span>
          <div className={styles.statusRow}>
            <StatusBadge
              tone={item.employmentStatus === "active" ? "success" : "neutral"}
            >
              {item.employmentStatus === "active"
                ? "Laboral: activo"
                : "Laboral: inactivo"}
            </StatusBadge>
            <StatusBadge tone={item.accessStatus === "active" ? "success" : "warning"}>
              {item.accessStatus === "active"
                ? "Acceso activo"
                : item.accessStatus === "invited"
                  ? "Invitado"
                  : "Acceso desactivado"}
            </StatusBadge>
          </div>
        </ElevatedSurface>
      ))}
    </ul>
  );
}
