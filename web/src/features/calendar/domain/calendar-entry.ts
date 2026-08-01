export type CalendarEntryKind = "birthday" | "event" | "pto";

export type CalendarEntry = {
  allDay: boolean;
  canManage: boolean;
  description: string | null;
  detailHref: string | null;
  endAt: string;
  endDate: string;
  id: string;
  kind: CalendarEntryKind;
  label: string;
  location: string | null;
  meetingUrl: string | null;
  note: string | null;
  startAt: string;
  startDate: string;
  title: string;
};

export type CalendarAgendaGroup = {
  date: string;
  entries: CalendarEntry[];
};

export function calendarEntryOccursOn(entry: CalendarEntry, date: string) {
  return entry.startDate <= date && entry.endDate >= date;
}

export function compareCalendarEntries(first: CalendarEntry, second: CalendarEntry) {
  return (
    first.startAt.localeCompare(second.startAt) ||
    Number(second.allDay) - Number(first.allDay) ||
    first.title.localeCompare(second.title, "es-CR")
  );
}

export function groupCalendarAgendaEntries(
  entries: readonly CalendarEntry[],
  monthStart: string,
): CalendarAgendaGroup[] {
  const groups = new Map<string, CalendarEntry[]>();

  for (const entry of [...entries].sort(compareCalendarEntries)) {
    const date = entry.startDate < monthStart ? monthStart : entry.startDate;
    const group = groups.get(date) ?? [];
    group.push(entry);
    groups.set(date, group);
  }

  return [...groups.entries()].map(([date, groupEntries]) => ({
    date,
    entries: groupEntries,
  }));
}
