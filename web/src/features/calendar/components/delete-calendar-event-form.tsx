import { Trash2 } from "lucide-react";

import { SubmitButton } from "@/components/ui/feedback/submit-button";
import { deleteCalendarEventAction } from "@/features/calendar/actions/calendar-event-actions";

import styles from "./calendar.module.css";

type DeleteCalendarEventFormProps = {
  eventId: string;
  month: string;
};

export function DeleteCalendarEventForm({
  eventId,
  month,
}: DeleteCalendarEventFormProps) {
  return (
    <details className={styles.deletePanel}>
      <summary>Eliminar evento</summary>
      <div>
        <h2>¿Querés eliminar este evento?</h2>
        <p className={styles.deleteDescription}>
          Dejará de aparecer en el calendario. Esta acción conservará un registro de
          auditoría.
        </p>
        <form action={deleteCalendarEventAction}>
          <input name="eventId" type="hidden" value={eventId} />
          <input name="month" type="hidden" value={month} />
          <input name="view" type="hidden" value="agenda" />
          <SubmitButton pendingLabel="Eliminando…" variant="danger">
            <Trash2 aria-hidden="true" size={17} />
            Confirmar eliminación
          </SubmitButton>
        </form>
      </div>
    </details>
  );
}
