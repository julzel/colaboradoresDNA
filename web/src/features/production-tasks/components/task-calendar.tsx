import Link from "next/link";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button/button";
import type {
  ProductionBoardResult,
  ProductionTaskEmployeeDto,
} from "../application/production-task-contracts";
import { getAreaColor } from "../presentation/area-color";
import styles from "./tasks.module.css";

export function formatCalendarDay(date: string, weekday?: "short") {
  return new Intl.DateTimeFormat("es-CR", {
    timeZone: "UTC",
    weekday: weekday ?? "long",
    ...(weekday ? {} : ({ day: "numeric", month: "long", year: "numeric" } as const)),
  }).format(new Date(`${date}T00:00:00Z`));
}

export function TaskCalendar({
  days,
  view,
  tasks,
  employees,
  currentEmployeeId,
  today,
  dayHref,
  filtered,
  onEdit,
}: {
  days: string[];
  view: "day" | "week";
  tasks: ProductionBoardResult["tasks"];
  employees: ProductionTaskEmployeeDto[];
  currentEmployeeId: string | null;
  today: string;
  dayHref: (date: string) => string;
  filtered: boolean;
  onEdit?: (id: string) => void;
}) {
  const names = new Map(
    employees.map((employee) => [employee.id, employee.displayName]),
  );
  return (
    <div className={styles.taskCalendar} data-view={view}>
      {days.map((day) => {
        const dayTasks = tasks.filter((task) => task.workDate === day);
        return (
          <section
            key={day}
            className={styles.calendarDay}
            aria-label={formatCalendarDay(day)}
            data-today={day === today}
          >
            {view === "day" && <h3 className="sr-only">{formatCalendarDay(day)}</h3>}
            {view === "week" && (
              <h3 className={styles.calendarDayHeading}>
                <Link href={dayHref(day)} aria-label={`Ver ${formatCalendarDay(day)}`}>
                  <span>{formatCalendarDay(day, "short")}</span>
                  <strong>{Number(day.slice(-2))}</strong>
                  <small>
                    {day === today ? "Hoy · " : ""}
                    {dayTasks.length} {dayTasks.length === 1 ? "tarea" : "tareas"}
                  </small>
                </Link>
              </h3>
            )}
            {dayTasks.length ? (
              <ul
                className={styles.calendarTasks}
                aria-label={`Tareas del ${formatCalendarDay(day)}`}
              >
                {dayTasks.map((task) => (
                  <li
                    key={task.id}
                    className={`${styles.calendarTask} ${styles.areaRow}`}
                    data-area={getAreaColor(task.areaName)}
                  >
                    <div className={styles.taskIdentity}>
                      <span className={styles.calendarArea}>{task.areaName}</span>
                      <h4>{task.description}</h4>
                    </div>
                    <dl className={styles.calendarFields}>
                      <div>
                        <dt>Producto o elemento</dt>
                        <dd>{task.subject || "Sin producto o elemento"}</dd>
                      </div>
                      <div>
                        <dt>Personas encargadas</dt>
                        <dd className={styles.assignees}>
                          {task.assigneeEmployeeIds.length
                            ? task.assigneeEmployeeIds.map((id) => (
                                <span className={styles.person} key={id}>
                                  {names.get(id) ?? "Colaborador anterior"}
                                  {id === currentEmployeeId && <small> · Tú</small>}
                                </span>
                              ))
                            : "Sin asignar"}
                        </dd>
                      </div>
                    </dl>
                    {onEdit &&
                      (task.workDate >= today ? (
                        <Button
                          variant="quiet"
                          onClick={() => onEdit(task.id)}
                          aria-label={`Editar ${task.description}`}
                          className={styles.calendarEdit}
                        >
                          <Pencil size={16} aria-hidden="true" />
                          Editar
                        </Button>
                      ) : (
                        <small className={styles.muted}>
                          Fecha pasada · Solo lectura
                        </small>
                      ))}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.calendarDayEmpty}>
                {filtered
                  ? "No hay tareas con estos filtros."
                  : "Sin tareas para este día."}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
