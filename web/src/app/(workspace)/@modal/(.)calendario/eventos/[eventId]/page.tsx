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
  const developmentHref = detail.developmentLink
    ? `/admin/colaboradores/${detail.developmentLink.employeeId}/desarrollo/1-a-1/${detail.developmentLink.meetingId}`
    : null;

  return (
    <Modal title={detail.event.title}>
      <CalendarEventDetailContent detail={detail} developmentHref={developmentHref} />
    </Modal>
  );
}
