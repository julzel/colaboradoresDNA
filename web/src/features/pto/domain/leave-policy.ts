import { addCalendarDays } from "@/features/calendar/domain/calendar-utils";

/** Inclusive two-calendar-day cutoff; leave beginning today has already started. */
export function canCancelLeave({
  status,
  startDate,
  today,
  administrator,
}: {
  status: string;
  startDate: string;
  today: string;
  administrator: boolean;
}) {
  return (
    ["draft", "pending", "approved"].includes(status) &&
    (administrator ? startDate > today : startDate >= addCalendarDays(today, 2))
  );
}
