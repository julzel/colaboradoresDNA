import { CakeSlice, CalendarDays, Flag, Umbrella } from "lucide-react";
import type { ComponentProps } from "react";

import type { CalendarEntry } from "@/features/calendar/domain/calendar-entry";
import { formatCalendarTime } from "@/features/calendar/domain/calendar-utils";

type CalendarEntryIconProps = ComponentProps<typeof CalendarDays> & {
  entry: CalendarEntry;
};

export function CalendarEntryIcon({ entry, ...props }: CalendarEntryIconProps) {
  if (entry.kind === "birthday") return <CakeSlice {...props} />;
  if (entry.kind === "holiday") return <Flag {...props} />;
  if (entry.kind === "pto") return <Umbrella {...props} />;
  return <CalendarDays {...props} />;
}

export function getCalendarEntryCategoryKey(entry: CalendarEntry) {
  return entry.kind === "event" ? `${entry.kind}:${entry.eventType}` : entry.kind;
}

export function getCalendarEntryCategoryLabel(entry: CalendarEntry) {
  if (entry.kind === "birthday") return "Cumpleaños";
  if (entry.kind === "holiday") return "Feriados nacionales";
  if (entry.kind === "pto") return "Ausencias";
  return entry.label;
}

export function getCalendarEntryPreviewTitle(entry: CalendarEntry) {
  if (entry.kind === "birthday") return "Cumpleaños";
  if (entry.kind === "holiday") return "Feriado";
  if (entry.kind === "pto") return entry.label.split(" · ")[0];
  return entry.title;
}

export function getCalendarEntryPreviewDetail(entry: CalendarEntry) {
  if (entry.kind !== "event") return entry.title;
  if (entry.allDay) return "Todo el día";
  return formatCalendarTime(entry.startAt);
}
