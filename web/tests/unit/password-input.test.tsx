import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TextField } from "@/components/ui/form-field/form-field";

describe("password visibility", () => {
  it("toggles without changing the value or submitting the form", async () => {
    const user = userEvent.setup();
    const submit = vi.fn((event) => event.preventDefault());
    render(
      <form onSubmit={submit}>
        <TextField
          id="password"
          name="password"
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          minLength={12}
          description="Usá al menos 12 caracteres."
        />
      </form>,
    );
    const input = screen.getByLabelText("Contraseña");
    await user.type(input, "example-password");
    expect(input).toHaveAttribute("type", "password");
    await user.tab();
    expect(screen.getByRole("button", { name: "Mostrar contraseña" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveValue("example-password");
    expect(input).toHaveAttribute("autocomplete", "new-password");
    expect(input).toHaveAccessibleDescription("Usá al menos 12 caracteres.");
    await user.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(input).toHaveAttribute("type", "password");
    expect(submit).not.toHaveBeenCalled();
  });

  it("disables the toggle with the field and leaves ordinary inputs unchanged", () => {
    render(
      <>
        <TextField id="password" label="Contraseña" type="password" disabled />
        <TextField id="email" label="Correo" type="email" />
      </>,
    );
    expect(screen.getByRole("button", { name: "Mostrar contraseña" })).toBeDisabled();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByLabelText("Correo")).toHaveAttribute("type", "email");
  });
});
