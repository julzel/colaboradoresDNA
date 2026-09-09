import Link from "next/link";
import type { LeaveConflict } from "../domain/leave-conflict";
import { formatPtoDateRange } from "../domain/pto";
import styles from "./pto.module.css";

export function LeaveConflictWarning({ conflicts }: { conflicts: LeaveConflict[] }) {
  if (!conflicts.length) return null;
  return (
    <div className={styles.warning} role="alert">
      <p>
        Estas fechas coinciden con otra solicitud. Cambiá el rango o cancelá la
        solicitud existente para continuar.
      </p>
      <ul>
        {conflicts.map((conflict) => (
          <li key={conflict.id}>
            <Link href={`/ausencias/${conflict.id}`}>
              {conflict.category} ·{" "}
              {formatPtoDateRange(conflict.startDate, conflict.endDate)} ·{" "}
              {conflict.status}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
