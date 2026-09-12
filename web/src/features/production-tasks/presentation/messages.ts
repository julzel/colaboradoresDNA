const messages: Record<string, string> = {
  task_date_past:
    "Las tareas de fechas pasadas no se pueden agregar, cambiar ni eliminar.",
  task_limit: "La semana de destino ya tiene 500 tareas.",
  pending_draft:
    "Esta semana tiene un borrador pendiente. Revisalo y publicalo desde el historial antes de editar el plan.",
  area_not_found: "Seleccioná un área activa.",
  active_employee_required: "Seleccioná colaboradores activos.",
  task_not_found: "La tarea ya no está disponible. Actualizá el plan.",
  forbidden:
    "Solo administradores y supervisores de Producción pueden administrar tareas.",
  file_too_large: "El archivo supera el máximo de 8 MB.",
  active_content:
    "El archivo contiene macros o vínculos externos. Eliminá ese contenido y volvé a cargarlo.",
  invalid_workbook:
    "No pudimos leer el archivo. Usá XLSX o CSV UTF-8 con las columnas de la plantilla.",
  limits_exceeded:
    "El archivo excede los límites de tamaño, filas o contenido. Dividilo en archivos más pequeños.",
  no_task_sheets:
    "No encontramos las columnas: Día o Fecha, Área de trabajo, Producto, Encargado y Tarea.",
  import_expired: "La revisión venció o ya fue importada. Cargá el archivo de nuevo.",
  import_invalid:
    "La importación no es válida. Revisá los errores, las semanas repetidas y el límite de 500 tareas por semana.",
  stale_version:
    "Otra persona modificó esta semana o revisión. Volvé a validar antes de confirmar.",
  draft_conflict:
    "Esta semana ya tiene tareas. Revisá el conflicto y confirmá el reemplazo.",
  warnings_unacknowledged: "Confirmá que revisaste las advertencias de disponibilidad.",
  publication_invalid: "No se puede publicar una semana vacía.",
  draft_not_found: "El borrador ya no está disponible. Revisá el historial.",
  week_missing: "Seleccioná el lunes de esta semana.",
  day_unknown: "Día no reconocido. Usá un nombre completo, por ejemplo Lunes.",
  date_invalid: "Fecha inválida. Usá AAAA-MM-DD o AAAA/MM/DD.",
  date_outside_week: "La fecha está fuera de la semana seleccionada.",
  day_mismatch: "La fecha y el día de la semana no coinciden.",
  area_unknown: "Seleccioná un área válida.",
  task_missing: "Falta la tarea. Corregí el archivo.",
  task_too_long: "La tarea supera 500 caracteres.",
  subject_too_long: "El producto supera 240 caracteres.",
  assignee_missing: "Falta la persona encargada.",
  assignee_unknown:
    "Hay personas sin identificar o con nombres repetidos. Buscá y seleccioná a cada persona encargada.",
  formula_ignored:
    "Se usó el resultado guardado de una fórmula, sin ejecutarla. Revisalo.",
  duplicate: "Esta tarea está duplicada. Corregí el archivo.",
  approved_leave: "Una persona asignada tiene una ausencia aprobada.",
  not_scheduled: "Una persona asignada no tiene jornada este día.",
  availability_unknown: "No pudimos verificar toda la disponibilidad.",
};
export function taskErrorMessage(code: string) {
  return (
    messages[code] ??
    "No pudimos completar la operación. Revisá los datos e intentá de nuevo."
  );
}
export const planStatusLabel = {
  draft: "Borrador",
  published: "Publicado",
  superseded: "Versión anterior",
};
export function formatTaskDate(date: string) {
  return new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
