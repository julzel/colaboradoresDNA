import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { EmployeeDirectory } from "@/features/employees/components/employee-directory";
import type { EmployeeDirectoryItem } from "@/features/employees/view-models/employee-view";

const items: EmployeeDirectoryItem[] = [
  {
    accessStatus: "active",
    departmentName: "Operaciones",
    displayName: "Ana Solano",
    employeeCode: "DNA-0001",
    employmentStartedOn: "2024-01-10",
    employmentStatus: "active",
    id: "employee-ana",
    managerName: "María Mora",
    platformRole: "collaborator",
    positionTitle: "Analista",
  },
  {
    accessStatus: "invited",
    departmentName: "Finanzas",
    displayName: "Carla Jiménez",
    employeeCode: "DNA-0002",
    employmentStartedOn: "2025-02-12",
    employmentStatus: "active",
    id: "employee-carla",
    managerName: "Pablo Ruiz",
    platformRole: "supervisor",
    positionTitle: "Jefatura",
  },
  {
    accessStatus: "deactivated",
    departmentName: "Operaciones",
    displayName: "Beto Álvarez",
    employeeCode: "DNA-0003",
    employmentStartedOn: "2022-07-04",
    employmentStatus: "inactive",
    id: "employee-beto",
    managerName: null,
    platformRole: "administrator",
    positionTitle: "Director",
  },
];

function tableNames() {
  const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
  return rows.map(
    (row) => within(row).getAllByRole("cell")[0]?.querySelector("a")?.textContent,
  );
}

describe("employee directory", () => {
  it("searches locally across the displayed collaborator fields", async () => {
    const user = userEvent.setup();
    render(<EmployeeDirectory items={items} />);

    expect(
      screen.getByRole("heading", { name: "Colaboradores del equipo" }),
    ).toBeVisible();

    await user.type(
      screen.getByRole("searchbox", { name: "Buscar colaboradores" }),
      "finanzas",
    );

    expect(screen.getByText("1 colaborador")).toBeInTheDocument();
    expect(tableNames()).toEqual(["Carla Jiménez"]);
    expect(window.location.search).toBe("");
  });

  it("sorts each table column locally and toggles its direction", async () => {
    const user = userEvent.setup();
    render(<EmployeeDirectory items={items} />);

    const sortableColumns = [
      "Colaborador",
      "Departamento",
      "Puesto",
      "Jefatura",
      "Rol",
      "Estado laboral",
      "Acceso",
    ];

    for (const column of sortableColumns) {
      expect(screen.getByRole("button", { name: column })).toBeInTheDocument();
    }

    await user.click(screen.getByRole("button", { name: "Departamento" }));
    expect(tableNames()).toEqual(["Carla Jiménez", "Ana Solano", "Beto Álvarez"]);

    await user.click(screen.getByRole("button", { name: "Departamento" }));
    expect(tableNames()).toEqual(["Ana Solano", "Beto Álvarez", "Carla Jiménez"]);
    expect(screen.getByRole("columnheader", { name: "Departamento" })).toHaveAttribute(
      "aria-sort",
      "descending",
    );
  });

  it("finds a collaborator by operational code", async () => {
    const user = userEvent.setup();
    render(<EmployeeDirectory items={items} />);

    await user.type(
      screen.getByRole("searchbox", { name: "Buscar colaboradores" }),
      "DNA-0003",
    );

    expect(tableNames()).toEqual(["Beto Álvarez"]);
  });
});
