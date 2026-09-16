import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { ButtonLink } from "@/components/ui/button/button";
import { getPublishedProductionBoard } from "../server/production-task-application";
import { formatTaskDate } from "../presentation/messages";
import { getAreaColor } from "../presentation/area-color";
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
  const todayTasks = mine.filter((task) => task.workDate === board?.today);
  const employeeNames = new Map(
    board?.employees.map((employee) => [employee.id, employee.displayName]) ?? [],
  );
  return (
    <ElevatedSurface className={styles.panel}>
      <div className={styles.toolbar}>
        <h2>
          Mis tareas de hoy{" "}
          <span className={styles.count}>{board ? todayTasks.length : ""}</span>
        </h2>
        <ButtonLink href="/tareas" variant="quiet">
          Ver todas las tareas
        </ButtonLink>
      </div>
      {!board ? (
        <p role="status">
          Las tareas no están disponibles en este momento. Podés reintentar desde
          Tareas.
        </p>
      ) : todayTasks.length ? (
        <ul className={styles.personalList}>
          {todayTasks.map((task) => (
            <li
              className={`${styles.calendarTask} ${styles.areaRow}`}
              data-area={getAreaColor(task.areaName)}
              key={task.id}
            >
              <div className={styles.taskIdentity}>
                <span className={styles.calendarArea}>{task.areaName}</span>
                <h3>{task.description}</h3>
              </div>
              <dl className={styles.calendarFields}>
                <div>
                  <dt>Día</dt>
                  <dd>
                    <time dateTime={task.workDate}>
                      {formatTaskDate(task.workDate)}
                    </time>
                  </dd>
                </div>
                <div>
                  <dt>Producto o elemento</dt>
                  <dd>{task.subject || "Sin producto o elemento"}</dd>
                </div>
                <div>
                  <dt>Personas encargadas</dt>
                  <dd className={styles.assignees}>
                    {task.assigneeEmployeeIds.map((id) => (
                      <span className={styles.person} key={id}>
                        {employeeNames.get(id) ?? "Colaborador anterior"}
                        {id === board.currentEmployeeId && <small> · Vos</small>}
                      </span>
                    ))}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>No tenés tareas asignadas para hoy.</p>
      )}
    </ElevatedSurface>
  );
}
