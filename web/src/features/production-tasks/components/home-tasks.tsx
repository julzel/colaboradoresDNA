import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { ButtonLink } from "@/components/ui/button/button";
import { getPublishedProductionBoard } from "../server/production-task-application";
import { formatTaskDate } from "../presentation/messages";
import styles from "./tasks.module.css";

export async function HomeTasks() {
  // The homepage has already authenticated; an unavailable task store is isolated.
  const board = await getPublishedProductionBoard({ view: "week" }).catch(() => null);
  const mine =
    board?.tasks.filter(
      (task) =>
        board.currentEmployeeId &&
        task.assigneeEmployeeIds.includes(board.currentEmployeeId),
    ) ?? [];
  const upcoming = mine.filter((task) => task.workDate >= board!.today);
  const visible = [
    ...upcoming,
    ...mine.filter((task) => task.workDate < board!.today),
  ].slice(0, 4);
  return (
    <ElevatedSurface className={styles.panel}>
      <div className={styles.toolbar}>
        <h2>
          Mis tareas de la semana{" "}
          <span className={styles.count}>{board ? mine.length : ""}</span>
        </h2>
        <ButtonLink href="/tareas?vista=mias" variant="quiet">
          Ver todas las tareas
        </ButtonLink>
      </div>
      {!board ? (
        <p role="status">
          Las tareas no están disponibles en este momento. Podés reintentar desde
          Tareas.
        </p>
      ) : visible.length ? (
        <ul className={styles.personalList}>
          {visible.map((task) => (
            <li key={task.id}>
              <span className={styles.muted}>
                {formatTaskDate(task.workDate)} · {task.areaName}
              </span>
              <strong>{task.description}</strong>
              {task.subject && <span>{task.subject}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>No tenés tareas asignadas para esta semana.</p>
      )}
    </ElevatedSurface>
  );
}
