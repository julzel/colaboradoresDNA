import { Upload } from "lucide-react";
import { Container } from "@/components/ui/container/container";
import { PageSectionHeader } from "@/components/ui/page-section-header/page-section-header";
import { getProductionTaskManagementAccess } from "@/features/production-tasks/server/production-task-application";
import { TaskImport } from "@/features/production-tasks/components/task-import";
import styles from "@/features/production-tasks/components/tasks.module.css";

export const metadata = { title: "Importar tareas" };
export default async function TaskImportPage() {
  await getProductionTaskManagementAccess();
  return (
    <Container className={styles.page}>
      <PageSectionHeader title="Importar tareas" icon={Upload} />
      <TaskImport />
    </Container>
  );
}
