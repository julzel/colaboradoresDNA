import { History } from "lucide-react";
import { Container } from "@/components/ui/container/container";
import { PageSectionHeader } from "@/components/ui/page-section-header/page-section-header";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { ButtonLink } from "@/components/ui/button/button";
import { Button } from "@/components/ui/button/button";
import { TextField } from "@/components/ui/form-field/form-field";
import { productionDateSchema } from "@/features/production-tasks/domain/shared";
import { getProductionPlanningDashboard } from "@/features/production-tasks/server/production-task-application";
import {
  formatTaskDate,
  planStatusLabel,
} from "@/features/production-tasks/presentation/messages";
import styles from "@/features/production-tasks/components/tasks.module.css";

export const metadata = { title: "Historial de tareas" };
export default async function TaskHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const query = await searchParams;
  const date = productionDateSchema.safeParse(query.fecha);
  const { plans } = await getProductionPlanningDashboard(
    date.success ? date.data : undefined,
  );
  return (
    <Container className={styles.page}>
      <PageSectionHeader
        title="Historial de tareas"
        icon={History}
        action={<ButtonLink href="/tareas/importar">Importar tareas</ButtonLink>}
      />
      <ElevatedSurface className={styles.panel}>
        <form action="/tareas/historial" className={styles.datePicker}>
          <TextField
            id="history-week"
            name="fecha"
            label="Buscar revisiones de una semana"
            type="date"
            defaultValue={date.success ? date.data : ""}
            required
          />
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </form>
        <p className={styles.muted}>
          Revisiones más recientes. Las versiones publicadas anteriores se conservan al
          reemplazar una semana.
        </p>
        {plans.length ? (
          <ul className={styles.history}>
            {plans.map((plan) => (
              <li key={plan.id}>
                <div>
                  <strong>
                    {formatTaskDate(plan.weekStart)} – {formatTaskDate(plan.weekEnd)}
                  </strong>
                  <p className={styles.muted}>
                    {planStatusLabel[plan.status]} · Versión {plan.revision} ·{" "}
                    {plan.taskCount} tareas
                  </p>
                </div>
                <ButtonLink href={`/tareas/planes/${plan.id}`} variant="quiet">
                  Ver revisión
                </ButtonLink>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>Todavía no hay semanas importadas.</p>
        )}
      </ElevatedSurface>
    </Container>
  );
}
