import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DevelopmentRecord } from "@/features/development/components/development-record";
import { OneOnOneForm } from "@/features/development/components/one-on-one-form";

const navigation = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
}));

vi.mock("@/features/development/actions/development-actions", () => ({
  createOneOnOneAction: vi.fn(),
  updateOneOnOneAction: vi.fn(),
  updateOneOnOneActionStatusAction: vi.fn(),
}));

describe("development 1:1 UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds and removes clear, accessible agreed-action fields", async () => {
    const user = userEvent.setup();
    render(
      <OneOnOneForm
        cancelHref="/admin/desarrollo"
        employeeId="507f1f77bcf86cd799439011"
        employeeName="Ana Vargas"
        today="2026-08-07"
      />,
    );

    expect(screen.queryByLabelText("Próximo paso")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Agregar acción" }));

    expect(screen.getByRole("group", { name: "Acción 1" })).toBeInTheDocument();
    expect(screen.getByLabelText("Próximo paso")).toBeRequired();
    expect(screen.getByLabelText("Responsable")).toHaveValue("employee");

    await user.click(screen.getByRole("button", { name: "Eliminar acción 1" }));
    expect(screen.queryByRole("group", { name: "Acción 1" })).not.toBeInTheDocument();
  });

  it("keeps the private calendar slot synchronized with the 1:1 date", async () => {
    const user = userEvent.setup();
    render(
      <OneOnOneForm
        cancelHref="/admin/desarrollo"
        employeeId="507f1f77bcf86cd799439011"
        employeeName="Ana Vargas"
        today="2026-08-07"
      />,
    );

    fireEvent.change(screen.getByLabelText("Fecha de la conversación"), {
      target: { value: "2026-08-12" },
    });
    await user.click(
      screen.getByRole("checkbox", {
        name: "Agregar esta conversación al calendario",
      }),
    );

    expect(screen.getByLabelText("Inicio")).toHaveValue("2026-08-12T09:00");
    expect(screen.getByLabelText("Final")).toHaveValue("2026-08-12T09:30");
    expect(screen.getByText(/visible solo para vos y Ana Vargas/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Fecha de la conversación"), {
      target: { value: "2026-08-13" },
    });
    expect(screen.getByLabelText("Inicio")).toHaveValue("2026-08-13T09:00");
    expect(screen.getByLabelText("Final")).toHaveValue("2026-08-13T09:30");
  });

  it("replaces the old placeholder with an actionable collaborator record", () => {
    render(
      <DevelopmentRecord
        employee={{
          departmentName: "Producción",
          displayName: "Ana Vargas",
          employmentStatus: "active",
          id: "507f1f77bcf86cd799439011",
          initials: "AV",
          platformUserId: "507f1f77bcf86cd799439012",
          positionTitle: "Empacadora",
        }}
        oneOnOnes={[]}
        summary={{
          activeGoalCount: 0,
          assessedSkillCount: 0,
          employeeId: "507f1f77bcf86cd799439011",
          lastFinalizedOneOnOneOn: null,
          nextOneOnOneDueOn: null,
          oneOnOneCadenceDays: null,
          openActionCount: 0,
          overdueActionCount: 0,
          overdueGoalCount: 0,
        }}
        today="2026-08-07"
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Ana Vargas" })).toBeVisible();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Primer seguimiento pendiente",
      }),
    ).toBeVisible();
    expect(screen.getAllByRole("link", { name: /Registrar.*1:1/i })[0]).toHaveAttribute(
      "href",
      "/admin/colaboradores/507f1f77bcf86cd799439011/desarrollo/1-a-1/nueva",
    );
    expect(screen.queryByText("Estamos preparando este espacio")).toBeNull();
    expect(screen.queryByText("Seguridad y acceso")).toBeNull();
  });
});
