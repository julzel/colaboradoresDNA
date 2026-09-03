import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/scheduling/actions/scheduler-actions", () => ({
  saveEmployeeScheduleAction: vi.fn(),
}));

import { ScheduleEditor } from "@/features/scheduling/components/schedule-editor";
import type { SchedulerDetailView } from "@/features/scheduling/view-models/scheduler-view";

const days = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const detail: SchedulerDetailView = {
  current: {
    displayName: "Ana Mora",
    effectiveLabel: null,
    id: "507f1f77bcf86cd799439011",
    scheduleSummary: null,
    status: "missing",
    weeks: [],
  },
  editor: {
    anchorDate: "2026-08-31",
    cycle: "weekly",
    effectiveFrom: "2026-09-02",
    hasLegacyTimes: false,
    weeks: [0, 1].map(() =>
      days.map((dayOfWeek) => ({
        dayLabel: dayOfWeek.slice(0, 3).toUpperCase(),
        dayOfWeek,
        enabled: dayOfWeek === "monday",
        endTime: "17:00",
        startTime: "08:00",
      })),
    ),
  },
  employee: { displayName: "Ana Mora", id: "507f1f77bcf86cd799439011" },
  history: [],
};

describe("schedule editor", () => {
  it("offers half-hour blocks only from 07:00 through 17:00", () => {
    render(<ScheduleEditor detail={detail} />);

    expect(
      screen.getByRole("gridcell", { name: "MON, 07:00 a 07:30" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("gridcell", { name: "MON, 16:30 a 17:00" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("gridcell", { name: "MON, 06:30 a 07:00" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("gridcell", { name: "MON, 17:00 a 17:30" }),
    ).not.toBeInTheDocument();
  });

  it("switches working days on and off from the sticky day controls", () => {
    render(<ScheduleEditor detail={detail} />);

    expect(screen.getByRole("checkbox", { name: /MON/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /TUE/ })).not.toBeChecked();

    fireEvent.click(screen.getByRole("checkbox", { name: /TUE/ }));
    expect(screen.getByRole("checkbox", { name: /TUE/ })).toBeChecked();
    expect(
      screen.getByRole("gridcell", { name: "TUE, 08:00 a 08:30" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("selects a consecutive range with Shift-click", () => {
    render(<ScheduleEditor detail={detail} />);

    fireEvent.click(screen.getByRole("gridcell", { name: "TUE, 07:30 a 08:00" }));
    fireEvent.click(screen.getByRole("gridcell", { name: "TUE, 09:00 a 09:30" }), {
      shiftKey: true,
    });

    expect(
      screen.getByRole("gridcell", { name: "TUE, 08:30 a 09:00" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(document.querySelector('input[name="week0.tuesday.startTime"]')).toHaveValue(
      "07:30",
    );
    expect(document.querySelector('input[name="week0.tuesday.endTime"]')).toHaveValue(
      "09:30",
    );
  });

  it("extends a consecutive selection with adjacent regular clicks", () => {
    render(<ScheduleEditor detail={detail} />);

    fireEvent.click(screen.getByRole("gridcell", { name: "WED, 10:00 a 10:30" }));
    fireEvent.click(screen.getByRole("gridcell", { name: "WED, 10:30 a 11:00" }));
    fireEvent.click(screen.getByRole("gridcell", { name: "WED, 09:30 a 10:00" }));

    expect(
      screen.getByRole("gridcell", { name: "WED, 10:00 a 10:30" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      document.querySelector('input[name="week0.wednesday.startTime"]'),
    ).toHaveValue("09:30");
    expect(document.querySelector('input[name="week0.wednesday.endTime"]')).toHaveValue(
      "11:00",
    );
  });

  it("removes a selected edge with a regular click", () => {
    render(<ScheduleEditor detail={detail} />);

    fireEvent.click(screen.getByRole("gridcell", { name: "TUE, 07:30 a 08:00" }));
    fireEvent.click(screen.getByRole("gridcell", { name: "TUE, 08:00 a 08:30" }));
    fireEvent.click(screen.getByRole("gridcell", { name: "TUE, 07:30 a 08:00" }));

    expect(
      screen.getByRole("gridcell", { name: "TUE, 07:30 a 08:00" }),
    ).toHaveAttribute("aria-selected", "false");
    expect(
      screen.getByRole("gridcell", { name: "TUE, 08:00 a 08:30" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("unselects a selected block with a regular click", () => {
    render(<ScheduleEditor detail={detail} />);

    const cell = screen.getByRole("gridcell", { name: "TUE, 07:30 a 08:00" });
    fireEvent.click(cell);
    expect(cell).toHaveAttribute("aria-selected", "true");

    fireEvent.click(cell);
    expect(cell).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("checkbox", { name: /TUE/ })).not.toBeChecked();
  });

  it("adds week B and its anchor when alternating is selected", () => {
    render(<ScheduleEditor detail={detail} />);

    fireEvent.change(screen.getByLabelText("Tipo de horario"), {
      target: { value: "alternating" },
    });

    expect(screen.getByText("Semana A")).toBeInTheDocument();
    expect(screen.getByText("Semana B")).toBeInTheDocument();
    expect(screen.getByLabelText("Lunes de inicio de la semana A")).toHaveValue(
      "2026-08-31",
    );
    expect(screen.getByRole("button", { name: "Copiar semana A" })).toBeInTheDocument();
  });
});
