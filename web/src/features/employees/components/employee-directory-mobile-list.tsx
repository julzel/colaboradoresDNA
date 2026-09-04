import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import type { EmployeeDirectoryItem } from "@/features/employees/view-models/employee-view";

import { EmployeeDirectoryAvatar } from "./employee-directory-avatar";
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
        <li className={styles.mobileItem} key={item.id}>
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
        </li>
      ))}
    </ul>
  );
}
