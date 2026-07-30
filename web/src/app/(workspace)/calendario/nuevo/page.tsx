import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/button/button";
import { CalendarEventForm } from "@/features/calendar/components/calendar-event-form";
import styles from "@/features/calendar/components/calendar.module.css";
import { getCalendarEventFormOptions } from "@/features/calendar/server/calendar-service";

export const metadata: Metadata = { title: "Nuevo evento" };

export default async function NewCalendarEventPage() {
  const options = await getCalendarEventFormOptions();

  return (
    <div className={styles.page}>
      <ButtonLink href="/calendario" size="small" variant="quiet">
        ← Volver al calendario
      </ButtonLink>
      <header className={styles.heading}>
        <p className="eyebrow">Calendario</p>
        <h1>Nuevo evento</h1>
        <p>Definí la fecha y quién podrá consultar el evento.</p>
      </header>
      <CalendarEventForm cancelHref="/calendario" mode="create" options={options} />
    </div>
  );
}
