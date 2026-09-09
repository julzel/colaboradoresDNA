import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PtoRequestForm } from "@/features/pto/components/pto-request-form";
import { PtoDecisionForm } from "@/features/pto/components/pto-transition-forms";

vi.mock("@/features/pto/actions/pto-actions", () => ({
  previewLeaveDurationAction: vi.fn().mockResolvedValue({ units: 2, message: null }),
  savePtoDraftAction: vi.fn(async () => ({
    status: "error",
    message: "Falta un horario asignado.",
  })),
  saveEmployeePtoDraftAction: vi.fn(),
  decidePtoRequestAction: vi.fn(async () => ({
    status: "warning",
    requiresConfirmation: true,
    message: "Revisá el saldo.",
  })),
  cancelPtoRequestAction: vi.fn(),
  reassignPtoApproverAction: vi.fn(),
  submitPtoRequestAction: vi.fn(),
}));

describe("leave form recovery", () => {
  it("preserves entered fields after a server validation error", async () => {
    const user = userEvent.setup();
    render(<PtoRequestForm />);
    await user.type(screen.getByLabelText("Fecha inicial"), "2026-10-05");
    await user.type(screen.getByLabelText("Fecha final"), "2026-10-05");
    await user.selectOptions(screen.getByLabelText("Jornada solicitada"), "half");
    expect(screen.getByLabelText("Jornada solicitada")).toHaveValue("half");
    await user.type(screen.getByLabelText("Nota"), "No perder esta nota");
    expect(screen.getByLabelText("Jornada solicitada")).toHaveValue("half");
    await user.click(screen.getByRole("button", { name: "Guardar borrador" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Falta un horario asignado.",
    );
    expect(screen.getByLabelText("Fecha inicial")).toHaveValue("2026-10-05");
    expect(screen.getByLabelText("Jornada solicitada")).toHaveValue("half");
    expect(screen.getByLabelText("Nota")).toHaveValue("No perder esta nota");
  });
  it("preserves the decision note when approval needs warning confirmation", async () => {
    const user = userEvent.setup();
    render(<PtoDecisionForm requestId="507f1f77bcf86cd799439015" />);
    await user.type(
      screen.getByLabelText("Nota de decisión"),
      "Revisado con administración",
    );
    await user.click(screen.getByRole("button", { name: "Aprobar" }));
    expect(
      await screen.findByRole("button", { name: "Aprobar de todos modos" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Nota de decisión")).toHaveValue(
      "Revisado con administración",
    );
  });
});
