import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PtoRequestModal } from "@/features/pto/components/pto-request-modal";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn() }),
}));

vi.mock("@/features/pto/actions/pto-actions", () => ({
  saveEmployeePtoDraftAction: vi.fn(),
  savePtoDraftAction: vi.fn(),
}));

describe("PtoRequestModal", () => {
  it("opens the new request form and closes it through Cancelar", async () => {
    const user = userEvent.setup();
    render(<PtoRequestModal />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Nueva solicitud" }));

    expect(screen.getByRole("dialog", { name: "Nueva solicitud" })).toBeInTheDocument();
    expect(
      screen.queryByText("Completá los datos de la ausencia y guardala como borrador."),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Categoría")).toHaveValue("vacation");

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
