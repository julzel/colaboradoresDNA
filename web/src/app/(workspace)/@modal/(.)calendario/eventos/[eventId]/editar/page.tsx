import { notFound, redirect } from "next/navigation";

import { Modal } from "@/components/ui/modal/modal";
import { CalendarEventForm } from "@/features/calendar/components/calendar-event-form";
import {
  getCalendarEventFormOptions,
  getVisibleCalendarEventDetail,
} from "@/features/calendar/server/calendar-service";

export default async function EditCalendarEventModal({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const detail = await getVisibleCalendarEventDetail(eventId);
  if (!detail) notFound();
  if (!detail.canManage) redirect("/access-denied?reason=forbidden");
  const options = await getCalendarEventFormOptions();

  return (
    <Modal
      description={
        detail.developmentLink
          ? "Actualizá la fecha y la hora. La privacidad se protege desde Desarrollo."
          : "Actualizá la información o la visibilidad del evento."
      }
      title="Editar evento"
    >
      <CalendarEventForm
        cancelBehavior="back"
        cancelHref={`/calendario/eventos/${eventId}`}
        developmentOneOnOne={Boolean(detail.developmentLink)}
        event={detail.event}
        mode="edit"
        options={options}
        presentation="modal"
      />
    </Modal>
  );
}
