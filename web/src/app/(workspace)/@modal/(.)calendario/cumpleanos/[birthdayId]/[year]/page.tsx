import { notFound } from "next/navigation";

import { Modal } from "@/components/ui/modal/modal";
import { CalendarBirthdayQuickDetailContent } from "@/features/calendar/components/calendar-quick-detail-content";
import { getVisibleCalendarBirthdayDetail } from "@/features/calendar/server/calendar-service";

export default async function CalendarBirthdayDetailModal({
  params,
}: {
  params: Promise<{ birthdayId: string; year: string }>;
}) {
  const { birthdayId, year } = await params;
  const detail = await getVisibleCalendarBirthdayDetail({
    birthdayId,
    year: Number(year),
  });
  if (!detail) notFound();

  return (
    <Modal title={detail.displayName}>
      <CalendarBirthdayQuickDetailContent detail={detail} />
    </Modal>
  );
}
