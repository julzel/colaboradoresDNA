import { MetricCard } from "@/components/ui/metric-card/metric-card";
import type { EmployeeDirectoryItem } from "@/features/employees/view-models/employee-view";

import styles from "./employee-management.module.css";

export function EmployeeDirectorySummary({
  items,
}: {
  items: EmployeeDirectoryItem[];
}) {
  const departmentCounts = new Map<string, number>();

  for (const item of items) {
    const department = item.departmentName ?? "Sin asignar";
    departmentCounts.set(department, (departmentCounts.get(department) ?? 0) + 1);
  }

  const departments = [...departmentCounts.entries()].sort(
    (first, second) =>
      second[1] - first[1] || first[0].localeCompare(second[0], "es-CR"),
  );
  const invited = items.filter((item) => item.accessStatus === "invited").length;

  return (
    <section aria-label="Resumen de colaboradores" className={styles.directoryMetrics}>
      {departments.map(([department, count]) => (
        <MetricCard key={department} label={department} value={count} />
      ))}
      <MetricCard label="Invitados" value={invited} />
    </section>
  );
}
