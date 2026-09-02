import {
  calculateAverageWeeklySchedule,
  scheduleDayOfWeekOrder,
  type ScheduleDayOfWeek,
  type ScheduleRecord,
} from "@/features/scheduling/domain/schedule";

const dayLabels: Record<ScheduleDayOfWeek, string> = {
  friday: "VIE",
  monday: "LUN",
  saturday: "SÁB",
  sunday: "DOM",
  thursday: "JUE",
  tuesday: "MAR",
  wednesday: "MIÉ",
};

const dateFormatter = new Intl.DateTimeFormat("es-CR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

export type SchedulerRosterStatus = "alternating" | "configured" | "missing";

export type SchedulerDayView = Readonly<{
  dayLabel: string;
  hoursLabel: string | null;
  isWorkingDay: boolean;
}>;

export type SchedulerWeekView = Readonly<{
  days: readonly SchedulerDayView[];
  label: string;
}>;

export type SchedulerRosterItemView = Readonly<{
  displayName: string;
  effectiveLabel: string | null;
  id: string;
  scheduleSummary: string | null;
  status: SchedulerRosterStatus;
  weeks: readonly SchedulerWeekView[];
}>;

export type SchedulerDashboardView = Readonly<{
  counts: {
    alternating: number;
    configured: number;
    missing: number;
    total: number;
  };
  items: readonly SchedulerRosterItemView[];
  selectedDate: string;
}>;

type SchedulerRosterSource = Readonly<{
  displayName: string;
  id: string;
  schedule: ScheduleRecord | null;
}>;

function formatDate(value: string) {
  return dateFormatter
    .format(new Date(`${value}T00:00:00.000Z`))
    .replace("sept", "sep");
}

function formatEffectivePeriod(schedule: ScheduleRecord) {
  if (schedule.effectiveTo === null) {
    return `Desde ${formatDate(schedule.effectiveFrom)}`;
  }

  return `${formatDate(schedule.effectiveFrom)} – ${formatDate(schedule.effectiveTo)}`;
}

function formatAverage(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatScheduleSummary(schedule: ScheduleRecord) {
  const average = calculateAverageWeeklySchedule(schedule);
  const averageHours = average.averageScheduledMinutes / 60;

  return `${formatAverage(average.averageWorkingDayCount)} días · ${formatAverage(averageHours)} h por semana`;
}

function formatLegacyHours(workFraction: number, halfDayPeriod: string | null) {
  if (workFraction === 0) return null;
  if (workFraction === 1) return "Jornada completa";
  return halfDayPeriod === "morning"
    ? "Media jornada · mañana"
    : "Media jornada · tarde";
}

function buildWeeks(schedule: ScheduleRecord): readonly SchedulerWeekView[] {
  if (schedule.version === 1) {
    return [
      {
        label: "Semana",
        days: scheduleDayOfWeekOrder.map((dayOfWeek) => {
          const day = schedule.days.find(
            (candidate) => candidate.dayOfWeek === dayOfWeek,
          )!;

          return {
            dayLabel: dayLabels[dayOfWeek],
            hoursLabel: formatLegacyHours(day.workFraction, day.halfDayPeriod),
            isWorkingDay: day.workFraction > 0,
          };
        }),
      },
    ];
  }

  return schedule.weeks.map((week, index) => ({
    label: schedule.weeks.length === 1 ? "Semana" : `Semana ${index === 0 ? "A" : "B"}`,
    days: scheduleDayOfWeekOrder.map((dayOfWeek) => {
      const shift = week.shifts.find((candidate) => candidate.dayOfWeek === dayOfWeek);

      return {
        dayLabel: dayLabels[dayOfWeek],
        hoursLabel: shift ? `${shift.startTime}–${shift.endTime}` : null,
        isWorkingDay: Boolean(shift),
      };
    }),
  }));
}

function buildItem(source: SchedulerRosterSource): SchedulerRosterItemView {
  if (!source.schedule) {
    return {
      displayName: source.displayName,
      effectiveLabel: null,
      id: source.id,
      scheduleSummary: null,
      status: "missing",
      weeks: [],
    };
  }

  return {
    displayName: source.displayName,
    effectiveLabel: formatEffectivePeriod(source.schedule),
    id: source.id,
    scheduleSummary: formatScheduleSummary(source.schedule),
    status:
      source.schedule.version === 2 && source.schedule.weeks.length === 2
        ? "alternating"
        : "configured",
    weeks: buildWeeks(source.schedule),
  };
}

export function buildSchedulerDashboardView(
  roster: readonly SchedulerRosterSource[],
  selectedDate: string,
): SchedulerDashboardView {
  const items = roster.map(buildItem);
  const missing = items.filter((item) => item.status === "missing").length;
  const alternating = items.filter((item) => item.status === "alternating").length;

  return {
    counts: {
      alternating,
      configured: items.length - missing,
      missing,
      total: items.length,
    },
    items,
    selectedDate,
  };
}
