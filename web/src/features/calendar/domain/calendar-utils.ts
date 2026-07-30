export const CALENDAR_TIME_ZONE = "America/Costa_Rica";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const localDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function datePartsInCostaRica(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: CALENDAR_TIME_ZONE,
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    day: values.day ?? "01",
    hour: values.hour === "24" ? "00" : (values.hour ?? "00"),
    minute: values.minute ?? "00",
    month: values.month ?? "01",
    year: values.year ?? "1970",
  };
}

export function isValidIsoDate(value: string) {
  if (!isoDatePattern.test(value)) return false;
  const [year = 0, month = 0, day = 0] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isValidLocalDateTime(value: string) {
  if (!localDateTimePattern.test(value)) return false;
  const [date = "", time = ""] = value.split("T");
  const [hour = -1, minute = -1] = time.split(":").map(Number);
  return isValidIsoDate(date) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function getTodayInCostaRica(now = new Date()) {
  const { day, month, year } = datePartsInCostaRica(now);
  return `${year}-${month}-${day}`;
}

export function getCurrentCalendarMonth(now = new Date()) {
  return getTodayInCostaRica(now).slice(0, 7);
}

export function addCalendarDays(value: string, amount: number) {
  const [year = 0, month = 0, day = 0] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return date.toISOString().slice(0, 10);
}

export function addCalendarMonths(value: string, amount: number) {
  const [year = 0, month = 0] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));
  return date.toISOString().slice(0, 7);
}

export function getCalendarMonthRange(month: string) {
  const startDate = `${month}-01`;
  const endDate = `${addCalendarMonths(month, 1)}-01`;

  return {
    endAt: calendarDateToUtc(endDate),
    endDate,
    startAt: calendarDateToUtc(startDate),
    startDate,
  };
}

export function calendarDateToUtc(value: string) {
  return new Date(`${value}T06:00:00.000Z`);
}

export function localDateTimeToUtc(value: string) {
  return new Date(`${value}:00-06:00`);
}

export function utcToCostaRicaDate(value: Date) {
  const { day, month, year } = datePartsInCostaRica(value);
  return `${year}-${month}-${day}`;
}

export function utcToCostaRicaDateTime(value: Date) {
  const { day, hour, minute, month, year } = datePartsInCostaRica(value);
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function formatCalendarMonth(month: string) {
  const date = new Date(`${month}-15T12:00:00.000Z`);
  const formatted = new Intl.DateTimeFormat("es-CR", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);

  return formatted.charAt(0).toLocaleUpperCase("es-CR") + formatted.slice(1);
}

export function formatCalendarDate(value: string, includeYear = false) {
  const date = new Date(`${value}T12:00:00.000Z`);
  return new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    weekday: "long",
    ...(includeYear ? { year: "numeric" } : {}),
  }).format(date);
}

export function formatCalendarTime(value: string) {
  return new Intl.DateTimeFormat("es-CR", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: CALENDAR_TIME_ZONE,
  }).format(new Date(value));
}

export function getCalendarMonthDays(month: string) {
  const [year = 0, monthNumber = 0] = month.split("-").map(Number);
  const firstDay = new Date(Date.UTC(year, monthNumber - 1, 1));
  const mondayOffset = (firstDay.getUTCDay() + 6) % 7;
  const gridStart = new Date(Date.UTC(year, monthNumber - 1, 1 - mondayOffset));

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setUTCDate(gridStart.getUTCDate() + index);
    const value = date.toISOString().slice(0, 10);

    return {
      day: date.getUTCDate(),
      inCurrentMonth: date.getUTCMonth() === monthNumber - 1,
      value,
    };
  });
}

export function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
