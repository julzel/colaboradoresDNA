import {
  calculateAverageWeeklySchedule,
  resolveScheduleDate,
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

export type SchedulerEditorDayView = Readonly<{
  dayLabel: string;
  dayOfWeek: ScheduleDayOfWeek;
  enabled: boolean;
  endTime: string;
  startTime: string;
}>;

export type SchedulerDetailView = Readonly<{
  current: SchedulerRosterItemView;
  editor: {
    anchorDate: string;
    cycle: "alternating" | "weekly";
    effectiveFrom: string;
    hasLegacyTimes: boolean;
    weeks: readonly (readonly SchedulerEditorDayView[])[];
  };
  employee: { displayName: string; id: string };
  history: readonly SchedulerRosterItemView[];
}>;

export type OwnScheduleView = Readonly<{
  activeWeekIndex: number | null;
  effectiveLabel: string | null;
  scheduleSummary: string | null;
  selectedDate: string;
  status: SchedulerRosterStatus;
  weeks: readonly SchedulerWeekView[];
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

function mondayForDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

function editorDays(schedule: ScheduleRecord | null, weekIndex: number) {
  return scheduleDayOfWeekOrder.map((dayOfWeek) => {
    if (!schedule) {
      return {
        dayLabel: dayLabels[dayOfWeek],
        dayOfWeek,
        enabled: false,
        endTime: "17:00",
        startTime: "08:00",
      };
    }

    if (schedule.version === 1) {
      const day = schedule.days.find((candidate) => candidate.dayOfWeek === dayOfWeek)!;
      return {
        dayLabel: dayLabels[dayOfWeek],
        dayOfWeek,
        enabled: day.workFraction > 0,
        endTime: "",
        startTime: "",
      };
    }

    const shift = schedule.weeks[weekIndex]?.shifts.find(
      (candidate) => candidate.dayOfWeek === dayOfWeek,
    );
    return {
      dayLabel: dayLabels[dayOfWeek],
      dayOfWeek,
      enabled: Boolean(shift),
      endTime: shift?.endTime ?? "17:00",
      startTime: shift?.startTime ?? "08:00",
    };
  });
}

export function buildSchedulerDetailView(input: {
  currentSchedule: ScheduleRecord | null;
  displayName: string;
  employeeId: string;
  history: readonly ScheduleRecord[];
  selectedDate: string;
}): SchedulerDetailView {
  const current = buildItem({
    displayName: input.displayName,
    id: input.employeeId,
    schedule: input.currentSchedule,
  });
  const cycle =
    input.currentSchedule?.version === 2 && input.currentSchedule.weeks.length === 2
      ? "alternating"
      : "weekly";

  return {
    current,
    editor: {
      anchorDate:
        input.currentSchedule?.version === 2
          ? input.currentSchedule.anchorDate
          : mondayForDate(input.selectedDate),
      cycle,
      effectiveFrom: input.selectedDate,
      hasLegacyTimes: input.currentSchedule?.version === 1,
      weeks: [
        editorDays(input.currentSchedule, 0),
        editorDays(cycle === "alternating" ? input.currentSchedule : null, 1),
      ],
    },
    employee: { displayName: input.displayName, id: input.employeeId },
    history: input.history.map((schedule) =>
      buildItem({
        displayName: input.displayName,
        id: input.employeeId,
        schedule,
      }),
    ),
  };
}

export function buildOwnScheduleView(
  schedule: ScheduleRecord | null,
  selectedDate: string,
): OwnScheduleView {
  const item = buildItem({
    displayName: "",
    id: schedule?.employeeId ?? "own-schedule",
    schedule,
  });

  return {
    activeWeekIndex: schedule
      ? resolveScheduleDate(schedule, selectedDate).cycleWeekIndex
      : null,
    effectiveLabel: item.effectiveLabel,
    scheduleSummary: item.scheduleSummary,
    selectedDate,
    status: item.status,
    weeks: item.weeks,
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
