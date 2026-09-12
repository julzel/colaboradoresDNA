import type {
  ProductionBoardResult,
  ProductionTaskEmployeeDto,
} from "../application/production-task-contracts";
import { formatTaskDate } from "../presentation/messages";
import styles from "./tasks.module.css";
import { Button } from "@/components/ui/button/button";
import { Pencil } from "lucide-react";

export type GridTask = Pick<
  ProductionBoardResult["tasks"][number],
  "id" | "workDate" | "areaName" | "subject" | "description" | "assigneeEmployeeIds"
>;
export function TaskGrid({
  tasks,
  employees,
  currentEmployeeId = null,
  today,
  onEdit,
}: {
  tasks: GridTask[];
  employees: ProductionTaskEmployeeDto[];
  currentEmployeeId?: string | null;
  today?: string;
  onEdit?: (id: string) => void;
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
                        {id === currentEmployeeId && <small> · Tú</small>}
                      </span>
                    ))}
                  </span>
                </dd>
              </div>
            </dl>
            {onEdit &&
              today &&
              (task.workDate >= today ? (
                <Button
                  variant="quiet"
                  onClick={() => onEdit(task.id)}
                  aria-label={`Editar ${task.description}`}
                >
                  <Pencil aria-hidden="true" size={18} />
                  Editar tarea
                </Button>
              ) : (
                <small className={styles.muted}>Fecha pasada · Solo lectura</small>
              ))}
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
          <caption className="sr-only">
            Tareas de la semana.
            {onEdit ? " Edición disponible desde hoy." : " Solo lectura."}
          </caption>
          <thead>
            <tr>
              <th scope="col">Día</th>
              <th scope="col">Área</th>
              <th scope="col">Producto o elemento</th>
              <th scope="col">Tarea</th>
              <th scope="col">Personas encargadas</th>
              {onEdit && (
                <th scope="col">
                  <span className="sr-only">Acciones</span>
                </th>
              )}
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
                        {id === currentEmployeeId && <small> · Tú</small>}
                      </span>
                    ))}
                  </span>
                </td>
                {onEdit && (
                  <td>
                    {today && task.workDate >= today ? (
                      <Button
                        variant="quiet"
                        aria-label={`Editar ${task.description}`}
                        title="Editar tarea"
                        onClick={() => onEdit(task.id)}
                      >
                        <Pencil aria-hidden="true" size={18} />
                      </Button>
                    ) : (
                      <small className={styles.muted}>Solo lectura</small>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
