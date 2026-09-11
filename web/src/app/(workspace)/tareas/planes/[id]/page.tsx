import { notFound } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { Container } from "@/components/ui/container/container";
import { PageSectionHeader } from "@/components/ui/page-section-header/page-section-header";
import { getProductionPlanEditor } from "@/features/production-tasks/server/production-task-application";
import { TaskPlan } from "@/features/production-tasks/components/task-plan";
import { productionObjectIdSchema } from "@/features/production-tasks/domain/shared";
import styles from "@/features/production-tasks/components/tasks.module.css";

export const metadata = { title: "Revisar semana de tareas" };
export default async function PlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!productionObjectIdSchema.safeParse(id).success) notFound();
  const result = await getProductionPlanEditor(id);
  if (!result) notFound();
  return (
    <Container className={styles.page}>
      <PageSectionHeader title="Revisar semana" icon={ClipboardList} />
      <TaskPlan key={`${id}-${result.plan.version}`} result={result} />
    </Container>
  );
}
