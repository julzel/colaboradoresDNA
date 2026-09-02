import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SchedulerDashboard } from "@/features/scheduling/components/scheduler-dashboard";
import type { SchedulerDashboardView } from "@/features/scheduling/view-models/scheduler-view";

const dashboard: SchedulerDashboardView = {
  counts: { alternating: 1, configured: 2, missing: 1, total: 3 },
  items: [
    {
      displayName: "Ana Mora",
      effectiveLabel: "Desde 31 ago 2026",
      id: "employee-1",
      scheduleSummary: "5 días · 45 h por semana",
      status: "configured",
      weeks: [
        {
          label: "Semana",
          days: [
            { dayLabel: "LUN", hoursLabel: "08:00–17:00", isWorkingDay: true },
            { dayLabel: "MAR", hoursLabel: "08:00–17:00", isWorkingDay: true },
          ],
        },
      ],
    },
    {
      displayName: "Luis Solano",
      effectiveLabel: "Desde 31 ago 2026",
      id: "employee-2",
      scheduleSummary: "5 días · 45 h por semana",
      status: "alternating",
      weeks: [
        { label: "Semana A", days: [] },
        { label: "Semana B", days: [] },
      ],
    },
    {
      displayName: "María Vega",
      effectiveLabel: null,
      id: "employee-3",
      scheduleSummary: null,
      status: "missing",
      weeks: [],
    },
  ],
  selectedDate: "2026-09-02",
};

describe("scheduler dashboard", () => {
  it("shows roster metrics and schedule previews", () => {
    render(<SchedulerDashboard {...dashboard} />);

    expect(screen.getByText("Horarios del equipo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Alternantes 1/ })).toBeInTheDocument();
    expect(screen.getAllByText("08:00–17:00")).toHaveLength(2);
    expect(screen.getByText("Sin horario configurado")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Administrar" })[0]).toHaveAttribute(
      "href",
      "/admin/horarios/employee-1?fecha=2026-09-02",
    );
  });

  it("filters by status and searches by collaborator name", () => {
    render(<SchedulerDashboard {...dashboard} />);

    fireEvent.click(screen.getByRole("button", { name: /Sin horario 1/ }));
    expect(screen.getByText("María Vega")).toBeInTheDocument();
    expect(screen.queryByText("Ana Mora")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Todos 3/ }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar colaboradores" }), {
      target: { value: "luis" },
    });
    expect(screen.getByText("Luis Solano")).toBeInTheDocument();
    expect(screen.queryByText("María Vega")).not.toBeInTheDocument();
  });
});
