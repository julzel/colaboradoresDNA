import { ClipboardList, Upload } from "lucide-react";
import { ButtonLink } from "@/components/ui/button/button";
import { Container } from "@/components/ui/container/container";
import { PageSectionHeader } from "@/components/ui/page-section-header/page-section-header";
import { getPublishedProductionBoard } from "@/features/production-tasks/server/production-task-application";
import { TaskBoard } from "@/features/production-tasks/components/task-board";
import { NewTaskButton } from "@/features/production-tasks/components/task-editor";
import { productionDateSchema } from "@/features/production-tasks/domain/shared";
import styles from "@/features/production-tasks/components/tasks.module.css";

export const metadata = { title: "Tareas de producción" };
export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; vista?: string }>;
}) {
  const query = await searchParams;
  const date = productionDateSchema.safeParse(query.fecha);
  const board = await getPublishedProductionBoard({
    ...(date.success ? { date: date.data } : {}),
    view: "week",
  });
  return (
    <Container className={styles.page}>
      <PageSectionHeader
        action={
          board.canManage ? (
            <div className={styles.actions}>
              <ButtonLink
                aria-label="Importar tareas"
                className={styles.importButton}
                href="/tareas/importar"
                size="small"
                variant="secondary"
                title="Importar tareas"
              >
                <Upload aria-hidden="true" size={18} />
                <span className={styles.importButtonLabel}>Importar tareas</span>
              </ButtonLink>
              <NewTaskButton today={board.today} date={board.query.selectedDate} />
            </div>
          ) : undefined
        }
        title="Tareas de producción"
        icon={ClipboardList}
      />
      <TaskBoard
        key={board.query.weekStart}
        board={board}
        initialMine={query.vista === "mias"}
      />
    </Container>
  );
}
