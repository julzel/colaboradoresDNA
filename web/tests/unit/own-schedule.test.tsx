import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OwnSchedule } from "@/features/scheduling/components/own-schedule";
import type { OwnScheduleView } from "@/features/scheduling/view-models/scheduler-view";

const schedule: OwnScheduleView = {
  activeWeekIndex: 1,
  effectiveLabel: "Desde 31 ago 2026",
  scheduleSummary: "5 días · 40 h por semana",
  selectedDate: "2026-09-07",
  status: "alternating",
  weeks: [
    {
      days: [
        { dayLabel: "LUN", hoursLabel: "08:00–17:00", isWorkingDay: true },
        { dayLabel: "MAR", hoursLabel: null, isWorkingDay: false },
      ],
      label: "Semana A",
    },
    {
      days: [
        { dayLabel: "LUN", hoursLabel: "08:00–17:00", isWorkingDay: true },
        { dayLabel: "MAR", hoursLabel: "08:00–17:00", isWorkingDay: true },
      ],
      label: "Semana B",
    },
  ],
};

describe("own schedule", () => {
  it("shows both patterns and identifies the current alternating week", () => {
    render(<OwnSchedule schedule={schedule} />);

    expect(screen.getByText("5 días · 40 h por semana")).toBeInTheDocument();
    expect(screen.getByText("Horario alternante")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Semana A" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Semana B" })).toBeInTheDocument();
    expect(screen.getByText("Actual")).toBeInTheDocument();
    expect(screen.getByText(/solo lectura/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("explains when no schedule is currently available", () => {
    render(
      <OwnSchedule
        schedule={{
          activeWeekIndex: null,
          effectiveLabel: null,
          scheduleSummary: null,
          selectedDate: "2026-09-07",
          status: "missing",
          weeks: [],
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Sin horario vigente" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/persona administradora/i)).toBeInTheDocument();
  });
});
