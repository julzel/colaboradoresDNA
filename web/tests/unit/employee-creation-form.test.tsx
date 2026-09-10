import { fireEvent, render, screen, within } from "@testing-library/react";
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
    expect(progress).toHaveTextContent("4Revisar y crear");

    const invitation = document.querySelector<HTMLInputElement>("#sendInvitation");
    expect(invitation).not.toBeNull();
    expect(invitation).not.toBeChecked();
  });

  it("applies the format for the selected Costa Rican identification type", () => {
    render(<EmployeeCreationForm departments={[]} managers={[]} />);

    const type = screen.getByLabelText("Tipo de identificación");
    const identification = screen.getByLabelText("Identificación");

    expect(identification).toHaveAttribute("placeholder", "1-2345-6789");
    fireEvent.change(identification, { target: { value: "1-2345-6789" } });
    expect(identification).toBeValid();

    fireEvent.change(type, { target: { value: "residence_id" } });
    expect(identification).toHaveAttribute("placeholder", "12345678901");
    expect(identification).toHaveAttribute("maxlength", "12");
    fireEvent.change(identification, { target: { value: "123 4567 8901" } });
    expect(identification).toBeInvalid();
    fireEvent.change(identification, { target: { value: "12345678901" } });
    expect(identification).toBeValid();
  });
});
