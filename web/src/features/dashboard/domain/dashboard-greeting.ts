export type DashboardGreetingPeriod = "afternoon" | "late-night" | "morning" | "night";

export type DashboardGreeting = {
  label: string;
  period: DashboardGreetingPeriod;
};

const costaRicaTimeZone = "America/Costa_Rica";

export function getDashboardGreeting(date = new Date()): DashboardGreeting {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: costaRicaTimeZone,
    }).format(date),
  );

  if (hour < 5) {
    return { label: "¿Seguís despierto?", period: "late-night" };
  }

  if (hour < 12) {
    return { label: "Buenos días", period: "morning" };
  }

  if (hour < 18) {
    return { label: "Buenas tardes", period: "afternoon" };
  }

  return { label: "Buenas noches", period: "night" };
}
