import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Modal } from "@/components/ui/modal/modal";

const navigationMocks = vi.hoisted(() => ({
  back: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigationMocks,
}));

describe("modal", () => {
  afterEach(() => {
    navigationMocks.back.mockClear();
    vi.restoreAllMocks();
  });

  it("labels the dialog, focuses close, and closes through browser history", async () => {
    const user = userEvent.setup();
    render(
      <Modal description="Descripción del modal" title="Nuevo evento">
        <p>Contenido</p>
      </Modal>,
    );

    const dialog = screen.getByRole("dialog", { name: "Nuevo evento" });
    const closeButton = screen.getByRole("button", { name: "Cerrar" });

    expect(dialog).toHaveAccessibleDescription("Descripción del modal");
    expect(closeButton).toHaveFocus();

    await user.click(closeButton);

    expect(navigationMocks.back).toHaveBeenCalledOnce();
  });

  it("closes with Escape and a backdrop click", () => {
    render(
      <Modal title="Editar evento">
        <p>Contenido</p>
      </Modal>,
    );

    const dialog = screen.getByRole("dialog", { name: "Editar evento" });
    fireEvent.keyDown(dialog, { key: "Escape" });
    fireEvent.click(dialog.parentElement as HTMLElement);

    expect(navigationMocks.back).toHaveBeenCalledTimes(2);
  });

  it("keeps an edited form open when discarding changes is rejected", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <Modal title="Editar evento">
        <form data-unsaved-changes="true">
          <input aria-label="Título" />
        </form>
      </Modal>,
    );

    await user.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(confirm).toHaveBeenCalledOnce();
    expect(navigationMocks.back).not.toHaveBeenCalled();
  });

  it("uses a local close callback without navigating", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(
      <Modal onClose={handleClose} title="Nuevo evento">
        <p>Contenido</p>
      </Modal>,
    );

    await user.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(handleClose).toHaveBeenCalledOnce();
    expect(navigationMocks.back).not.toHaveBeenCalled();
  });
});
