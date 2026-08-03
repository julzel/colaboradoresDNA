import { notFound } from "next/navigation";

import { Modal } from "@/components/ui/modal/modal";
import { CalendarPtoQuickDetailContent } from "@/features/calendar/components/calendar-quick-detail-content";
import { getVisibleCalendarPtoDetail } from "@/features/calendar/server/calendar-service";

export default async function CalendarPtoDetailModal({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const detail = await getVisibleCalendarPtoDetail(requestId);
  if (!detail) notFound();

  return (
    <Modal title={detail.requesterName}>
      <CalendarPtoQuickDetailContent detail={detail} />
    </Modal>
  );
}
