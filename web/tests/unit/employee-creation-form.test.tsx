import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EmployeeCreationForm } from "@/features/employees/components/employee-creation-form";

vi.mock("@/features/employees/actions/employee-actions", () => ({
  createEmployeeAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("employee creation form", () => {
  it("keeps scheduling out of creation and makes the invitation optional", () => {
    render(
      <EmployeeCreationForm
        departments={[
          {
            id: "507f1f77bcf86cd799439014",
            name: "Producción",
            normalizedName: "produccion",
            status: "active",
            createdAt: new Date(),
            updatedAt: new Date(),
            description: null,
          },
        ]}
        managers={[]}
      />,
    );

    const progress = screen.getByRole("list", { name: "Progreso del registro" });
    expect(within(progress).getAllByRole("listitem")).toHaveLength(4);
    expect(progress).not.toHaveTextContent("Horario");
    expect(progress).toHaveTextContent("4. Revisar y crear");

    const invitation = document.querySelector<HTMLInputElement>("#sendInvitation");
    expect(invitation).not.toBeNull();
    expect(invitation).not.toBeChecked();
  });
});
