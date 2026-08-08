import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DevelopmentDashboardShell } from "@/features/development/components/development-dashboard-shell";

const directory = {
  items: [
    {
      activeGoalCount: 2,
      assessedSkillCount: 3,
      departmentName: "Producción",
      displayName: "Ana Vargas",
      employmentStatus: "active" as const,
      employeeId: "507f1f77bcf86cd799439011",
      lastFinalizedOneOnOneOn: "2026-05-01",
      nextOneOnOneDueOn: "2026-05-31",
      openActionCount: 1,
      overdueActionCount: 1,
      overdueGoalCount: 1,
      positionTitle: "Empacadora",
    },
    {
      activeGoalCount: 0,
      assessedSkillCount: 0,
      departmentName: "Calidad",
      displayName: "Luis Mora",
      employmentStatus: "active" as const,
      employeeId: "507f1f77bcf86cd799439012",
      lastFinalizedOneOnOneOn: null,
      nextOneOnOneDueOn: null,
      openActionCount: 0,
      overdueActionCount: 0,
      overdueGoalCount: 0,
      positionTitle: "Inspector",
    },
    {
      activeGoalCount: 1,
      assessedSkillCount: 2,
      departmentName: "Servicio al cliente",
      displayName: "Marta Solano",
      employmentStatus: "active" as const,
      employeeId: "507f1f77bcf86cd799439013",
      lastFinalizedOneOnOneOn: "2026-07-25",
      nextOneOnOneDueOn: "2026-08-24",
      openActionCount: 2,
      overdueActionCount: 0,
      overdueGoalCount: 0,
      positionTitle: "Agente",
    },
    {
      activeGoalCount: 0,
      assessedSkillCount: 1,
      departmentName: "Producción",
      displayName: "Carlos Rojas",
      employmentStatus: "inactive" as const,
      employeeId: "507f1f77bcf86cd799439014",
      lastFinalizedOneOnOneOn: "2026-01-10",
      nextOneOnOneDueOn: "2026-02-09",
      openActionCount: 0,
      overdueActionCount: 0,
      overdueGoalCount: 0,
      positionTitle: "Operario",
    },
  ],
  today: "2026-08-07",
};

describe("development dashboard", () => {
  it("uses three actionable metrics to filter active collaborators", () => {
    render(<DevelopmentDashboardShell directory={directory} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Desarrollo" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Seguimiento vencido 1/ }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: /Sin primer 1:1 1/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /Al día 1/ })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /Sin primer 1:1 1/ }));

    expect(screen.getAllByText("Luis Mora")).toHaveLength(2);
    expect(screen.queryByText("Ana Vargas")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sin primer 1:1 1/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("defaults to active employees and sorts all results by urgency", () => {
    const { container } = render(<DevelopmentDashboardShell directory={directory} />);
    const employmentFilter = screen.getByRole("combobox", { name: "Estado laboral" });

    expect(employmentFilter).toHaveValue("active");
    expect(screen.queryByText("Carlos Rojas")).not.toBeInTheDocument();

    fireEvent.change(employmentFilter, { target: { value: "all" } });

    const desktopNames = Array.from(
      container.querySelectorAll("tbody tr td:first-child strong"),
    ).map((element) => element.textContent);
    expect(desktopNames).toEqual([
      "Ana Vargas",
      "Luis Mora",
      "Marta Solano",
      "Carlos Rojas",
    ]);
    expect(screen.getAllByText("Inactivo · solo consulta")).toHaveLength(2);
  });

  it("provides one explicit tab stop for each available destination", () => {
    render(<DevelopmentDashboardShell directory={directory} />);

    for (const link of screen.getAllByRole("link", {
      name: "Registrar 1:1 con Ana Vargas",
    })) {
      expect(link).toHaveTextContent("Registrar 1:1");
      expect(link).toHaveAttribute(
        "href",
        "/admin/colaboradores/507f1f77bcf86cd799439011/desarrollo/1-a-1/nueva",
      );
    }
    for (const link of screen.getAllByRole("link", {
      name: "Ver desarrollo de Ana Vargas",
    })) {
      expect(link).toHaveTextContent("Ver desarrollo");
      expect(link).toHaveAttribute(
        "href",
        "/admin/colaboradores/507f1f77bcf86cd799439011/desarrollo",
      );
    }
    expect(screen.queryByRole("link", { name: "Ana Vargas" })).not.toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: "Colaboradores para seguimiento" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "Directorio de seguimiento de desarrollo" }),
    ).toBeInTheDocument();
  });

  it("searches safely and can clear a no-match state", () => {
    render(<DevelopmentDashboardShell directory={directory} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar" }), {
      target: { value: "No existe" },
    });

    expect(
      screen.getByRole("heading", { level: 3, name: "No hay resultados" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    expect(screen.getAllByText("Ana Vargas")).toHaveLength(2);
    expect(screen.getByRole("searchbox", { name: "Buscar" })).toHaveValue("");
  });

  it("distinguishes an empty employee directory from filtered results", () => {
    render(
      <DevelopmentDashboardShell
        directory={{
          items: [],
          today: "2026-08-07",
        }}
      />,
    );

    const emptyState = screen.getByRole("heading", {
      level: 3,
      name: "Todavía no hay colaboradores",
    }).parentElement;
    expect(emptyState).not.toBeNull();
    expect(
      within(emptyState!).getByRole("link", { name: "Agregar colaborador" }),
    ).toHaveAttribute("href", "/admin/colaboradores/nuevo");
    expect(screen.queryByText("No hay resultados")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Seguimiento vencido/ }),
    ).not.toBeInTheDocument();
  });
});
