import {
  addCalendarMonths,
  getCurrentCalendarMonth,
  isValidIsoDate,
} from "@/features/calendar/domain/calendar-utils";

export type CalendarView = "agenda" | "month";

export type CalendarQuery = {
  day: string | null;
  month: string;
  view: CalendarView;
};

function singleValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export function isValidCalendarMonth(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) return false;
  const [year = 0, month = 0] = value.split("-").map(Number);
  return year >= 2000 && year <= 2100 && month >= 1 && month <= 12;
}

export function parseCalendarQuery(
  params: Record<string, string | string[] | undefined>,
  currentMonth = getCurrentCalendarMonth(),
): CalendarQuery {
  const requestedMonth = singleValue(params.mes);
  const month =
    requestedMonth && isValidCalendarMonth(requestedMonth)
      ? requestedMonth
      : currentMonth;
  const view = singleValue(params.vista) === "mes" ? "month" : "agenda";
  const requestedDay = singleValue(params.dia);
  const day =
    view === "month" &&
    requestedDay &&
    isValidIsoDate(requestedDay) &&
    requestedDay.startsWith(`${month}-`)
      ? requestedDay
      : null;

  return { day, month, view };
}

export function createCalendarUrl({
  day,
  month,
  view,
}: {
  day?: string | null;
  month: string;
  view: CalendarView;
}) {
  const params = new URLSearchParams({
    mes: month,
    vista: view === "month" ? "mes" : "agenda",
  });

  if (view === "month" && day) params.set("dia", day);
  return `/calendario?${params.toString()}`;
}

export function getAdjacentCalendarMonth(query: CalendarQuery, amount: number) {
  return createCalendarUrl({
    month: addCalendarMonths(query.month, amount),
    view: query.view,
  });
}
