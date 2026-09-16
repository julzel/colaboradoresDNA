import { ClipboardList } from "lucide-react";

import { Container } from "@/components/ui/container/container";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { LoadingRegion, Skeleton } from "@/components/ui/feedback/skeleton";
import { PageSectionHeader } from "@/components/ui/page-section-header/page-section-header";

import styles from "./tasks.module.css";

const dayPlaceholders = Array.from({ length: 7 }, (_, index) => index);
const taskPlaceholders = Array.from({ length: 3 }, (_, index) => index);

export function TasksLoading() {
  return (
    <LoadingRegion label="Cargando tareas">
      <Container className={styles.page}>
        <PageSectionHeader icon={ClipboardList} title="Tareas de producción" />

        <ElevatedSurface as="section" className={styles.workPlan}>
          <div className={`${styles.workPlanHeader} ${styles.loadingPlanHeader}`}>
            <div className={styles.loadingCopy}>
              <Skeleton height="1.5rem" variant="line" width="10rem" />
              <Skeleton variant="line" width="13rem" />
            </div>
            <div className={styles.loadingNavigation}>
              <Skeleton height="2.5rem" width="8rem" />
              <Skeleton height="2.5rem" width="9rem" />
            </div>
          </div>

          <div className={styles.loadingToolbar}>
            <div className={styles.loadingNavigation}>
              <Skeleton height="2.5rem" width="9rem" />
              <Skeleton height="2.5rem" width="7rem" />
            </div>
            <Skeleton height="2.5rem" width="8rem" />
          </div>

          <div className={styles.loadingDayStrip}>
            {dayPlaceholders.map((day) => (
              <Skeleton height="4.25rem" key={day} />
            ))}
          </div>

          <div className={styles.workPlanContent}>
            <Skeleton variant="line" width="10rem" />
            <div className={styles.loadingTaskList}>
              {taskPlaceholders.map((task) => (
                <div className={styles.loadingTask} key={task}>
                  <Skeleton variant="line" width="6rem" />
                  <Skeleton height="1.125rem" variant="line" width="12rem" />
                  <Skeleton variant="line" width="8rem" />
                  <Skeleton height="1.5rem" variant="line" width="7rem" />
                </div>
              ))}
            </div>
          </div>
        </ElevatedSurface>
      </Container>
    </LoadingRegion>
  );
}
