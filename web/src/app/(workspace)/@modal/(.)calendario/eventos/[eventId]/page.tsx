import { notFound } from "next/navigation";

import { Modal } from "@/components/ui/modal/modal";
import { CalendarEventDetailContent } from "@/features/calendar/components/calendar-event-detail-content";
import { getVisibleCalendarEventDetail } from "@/features/calendar/server/calendar-service";

export default async function CalendarEventDetailModal({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const detail = await getVisibleCalendarEventDetail(eventId);
  if (!detail) notFound();

  return (
    <Modal title={detail.event.title}>
      <CalendarEventDetailContent detail={detail} />
    </Modal>
  );
}
