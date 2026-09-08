import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PtoAdminRequestModal } from "@/features/pto/components/pto-admin-request-modal";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn() }),
}));

vi.mock("@/features/pto/actions/pto-actions", () => ({
  saveEmployeePtoDraftAction: vi.fn(),
  savePtoDraftAction: vi.fn(),
}));

describe("administrator PTO request modal", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("selects an active collaborator and confirms immediate approval", async () => {
    const user = userEvent.setup();

    render(
      <PtoAdminRequestModal
        collaborators={[{ displayName: "Ana Mora", id: "507f1f77bcf86cd799439012" }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Nueva ausencia" }));
    expect(screen.getByRole("dialog", { name: "Nueva ausencia" })).toBeVisible();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Colaborador" }),
      "507f1f77bcf86cd799439012",
    );
    const confirmation = screen.getByRole("checkbox", {
      name: "Confirmo que esta ausencia se aprobará inmediatamente",
    });
    expect(confirmation).toBeRequired();
    expect(confirmation).not.toBeChecked();
    await user.click(confirmation);
    expect(confirmation).toBeChecked();
    expect(screen.getByRole("combobox", { name: "Jornada solicitada" })).toHaveValue(
      "full",
    );
    expect(
      screen.queryByRole("spinbutton", { name: "Duración (días)" }),
    ).not.toBeInTheDocument();
  });

  it("disables creation when there are no active collaborators", () => {
    render(<PtoAdminRequestModal collaborators={[]} />);

    expect(screen.getByRole("button", { name: "Nueva ausencia" })).toBeDisabled();
  });
});
