import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmployeeDirectorySummary } from "@/features/employees/components/employee-directory-summary";
import type { EmployeeDirectoryItem } from "@/features/employees/view-models/employee-view";

const baseItem: EmployeeDirectoryItem = {
  accessStatus: "active",
  departmentName: "Producción",
  displayName: "Ana Solano",
  employeeCode: "DNA-0001",
  employmentStartedOn: "2024-01-10",
  employmentStatus: "active",
  id: "employee-ana",
  managerName: null,
  platformRole: "collaborator",
  positionTitle: "Operaria",
};

describe("employee directory summary", () => {
  it("shows one card per department and an invited collaborators card", () => {
    render(
      <EmployeeDirectorySummary
        items={[
          baseItem,
          {
            ...baseItem,
            accessStatus: "invited",
            displayName: "Beto Mora",
            id: "employee-beto",
            platformRole: "supervisor",
          },
          {
            ...baseItem,
            accessStatus: "deactivated",
            departmentName: "Administración",
            displayName: "Carla Ruiz",
            id: "employee-carla",
            platformRole: "administrator",
          },
          {
            ...baseItem,
            departmentName: "Nutrición",
            displayName: "Diana Vargas",
            id: "employee-diana",
          },
        ]}
      />,
    );

    const summary = screen.getByRole("region", { name: "Resumen de colaboradores" });
    expect(summary.children).toHaveLength(4);
    expect(within(summary).getByText("Producción").nextSibling).toHaveTextContent("2");
    expect(within(summary).getByText("Administración").nextSibling).toHaveTextContent(
      "1",
    );
    expect(within(summary).getByText("Nutrición").nextSibling).toHaveTextContent("1");
    expect(within(summary).getByText("Invitados").nextSibling).toHaveTextContent("1");
    expect(within(summary).queryByText("Acceso activo")).not.toBeInTheDocument();
  });
});
