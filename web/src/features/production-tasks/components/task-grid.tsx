import type {
  ProductionBoardResult,
  ProductionTaskEmployeeDto,
} from "../application/production-task-contracts";
import { formatTaskDate } from "../presentation/messages";
import styles from "./tasks.module.css";

export type GridTask = Pick<
  ProductionBoardResult["tasks"][number],
  "id" | "workDate" | "areaName" | "subject" | "description" | "assigneeEmployeeIds"
>;
export function TaskGrid({
  tasks,
  employees,
  currentEmployeeId = null,
}: {
  tasks: GridTask[];
  employees: ProductionTaskEmployeeDto[];
  currentEmployeeId?: string | null;
}) {
  const names = new Map(
    employees.map((employee) => [employee.id, employee.displayName]),
  );
  if (!tasks.length)
    return <p className={styles.empty}>No hay tareas para esta selección.</p>;
  return (
    <>
      <ul className={styles.taskCards} aria-label="Tareas de la semana">
        {tasks.map((task) => (
          <li key={task.id}>
            <strong>{task.description}</strong>
            <dl>
              <div>
                <dt>Día</dt>
                <dd>
                  <time dateTime={task.workDate}>{formatTaskDate(task.workDate)}</time>
                </dd>
              </div>
              <div>
                <dt>Área</dt>
                <dd>{task.areaName}</dd>
              </div>
              <div>
                <dt>Producto o elemento</dt>
                <dd>{task.subject || "—"}</dd>
              </div>
              <div>
                <dt>Personas encargadas</dt>
                <dd>
                  <span className={styles.assignees}>
                    {task.assigneeEmployeeIds.map((id) => (
                      <span className={styles.person} key={id}>
                        {names.get(id) ?? "Colaborador anterior"}
                        {id === currentEmployeeId && <small> · Vos</small>}
                      </span>
                    ))}
                  </span>
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      <div
        className={styles.gridScroll}
        role="region"
        aria-label="Tabla de tareas, desplazable horizontalmente"
        tabIndex={0}
      >
        <table className={styles.grid}>
          <caption className="sr-only">Tareas de la semana. Solo lectura.</caption>
          <thead>
            <tr>
              <th scope="col">Día</th>
              <th scope="col">Área</th>
              <th scope="col">Producto o elemento</th>
              <th scope="col">Tarea</th>
              <th scope="col">Personas encargadas</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr
                key={task.id}
                data-mine={
                  !!currentEmployeeId &&
                  task.assigneeEmployeeIds.includes(currentEmployeeId)
                }
              >
                <th scope="row">
                  <time dateTime={task.workDate}>{formatTaskDate(task.workDate)}</time>
                </th>
                <td>{task.areaName}</td>
                <td>{task.subject || "—"}</td>
                <td className={styles.taskDescription}>{task.description}</td>
                <td>
                  <span className={styles.assignees}>
                    {task.assigneeEmployeeIds.map((id) => (
                      <span className={styles.person} key={id}>
                        {names.get(id) ?? "Colaborador anterior"}
                        {id === currentEmployeeId && <small> · Vos</small>}
                      </span>
                    ))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
