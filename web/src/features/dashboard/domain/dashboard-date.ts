const costaRicaTimeZone = "America/Costa_Rica";

function capitalize(value: string) {
  return value.charAt(0).toLocaleUpperCase("es-CR") + value.slice(1);
}

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((item) => item.type === type)?.value ?? "";
}

export function getDashboardDate(date = new Date()) {
  const labelParts = new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "long",
    timeZone: costaRicaTimeZone,
    weekday: "long",
    year: "numeric",
  }).formatToParts(date);
  const isoParts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: costaRicaTimeZone,
    year: "numeric",
  }).formatToParts(date);

  return {
    iso: `${part(isoParts, "year")}-${part(isoParts, "month")}-${part(isoParts, "day")}`,
    label: `${capitalize(part(labelParts, "weekday"))}, ${part(labelParts, "day")} de ${part(labelParts, "month")} ${part(labelParts, "year")}`,
  };
}
