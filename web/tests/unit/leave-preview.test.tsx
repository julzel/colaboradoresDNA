import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PtoRequestForm } from "@/features/pto/components/pto-request-form";
const preview = vi.hoisted(() => vi.fn());
vi.mock("@/features/pto/actions/pto-actions", () => ({
  previewLeaveDurationAction: preview,
  savePtoDraftAction: vi.fn(),
  saveEmployeePtoDraftAction: vi.fn(),
}));
describe("live leave duration", () => {
  it("shows the conflicting request and blocks creation until the dates change", async () => {
    preview.mockResolvedValue({
      units: null,
      message: "Coincidencia",
      conflicts: [
        {
          id: "507f1f77bcf86cd799439011",
          category: "Vacaciones",
          startDate: "2026-09-14",
          endDate: "2026-09-16",
          status: "Aprobada",
        },
      ],
    });
    render(<PtoRequestForm />);
    fireEvent.change(screen.getByLabelText("Fecha inicial"), {
      target: { value: "2026-09-14" },
    });
    fireEvent.change(screen.getByLabelText("Fecha final"), {
      target: { value: "2026-09-16" },
    });
    expect(
      await screen.findByRole("link", { name: /Vacaciones.*Aprobada/ }),
    ).toHaveAttribute("href", "/ausencias/507f1f77bcf86cd799439011");
    expect(screen.getByRole("button", { name: "Guardar borrador" })).toBeDisabled();
    preview.mockResolvedValue({ units: 2, message: null, conflicts: [] });
    fireEvent.change(screen.getByLabelText("Fecha inicial"), {
      target: { value: "2026-09-17" },
    });
    fireEvent.change(screen.getByLabelText("Fecha final"), {
      target: { value: "2026-09-17" },
    });
    expect(await screen.findByText(/Total solicitado: 1/)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Vacaciones.*Aprobada/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar borrador" })).toBeEnabled();
  });
  beforeEach(() => {
    preview.mockReset();
  });
  it("shows the server's calculated working days and updates after a date change", async () => {
    preview.mockResolvedValue({ units: 4, message: null });
    render(<PtoRequestForm />);
    fireEvent.change(screen.getByLabelText("Fecha inicial"), {
      target: { value: "2026-09-14" },
    });
    fireEvent.change(screen.getByLabelText("Fecha final"), {
      target: { value: "2026-09-16" },
    });
    expect(
      await screen.findByText(/Total solicitado: 2 días laborales/),
    ).toBeInTheDocument();
    expect(preview).toHaveBeenCalledWith(
      expect.objectContaining({ startDate: "2026-09-14", endDate: "2026-09-16" }),
      undefined,
      undefined,
    );
    preview.mockResolvedValue({ units: 6, message: null });
    fireEvent.change(screen.getByLabelText("Fecha final"), {
      target: { value: "2026-09-17" },
    });
    expect(screen.queryByText(/Total solicitado: 2/)).not.toBeInTheDocument();
    expect(
      await screen.findByText(/Total solicitado: 3 días laborales/),
    ).toBeInTheDocument();
  });
  it("shows calculation errors instead of an invented duration", async () => {
    preview.mockResolvedValue({
      units: null,
      message: "No se pudieron verificar los feriados.",
    });
    render(<PtoRequestForm />);
    fireEvent.change(screen.getByLabelText("Fecha inicial"), {
      target: { value: "2026-09-14" },
    });
    fireEvent.change(screen.getByLabelText("Fecha final"), {
      target: { value: "2026-09-16" },
    });
    expect(
      await screen.findByText("No se pudieron verificar los feriados."),
    ).toBeInTheDocument();
  });
});
