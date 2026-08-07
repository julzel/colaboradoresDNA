import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MobileNavigation } from "@/components/layout/mobile-navigation/mobile-navigation";

let pathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

vi.mock("@clerk/nextjs", () => ({
  SignOutButton: ({ children }: { children: ReactNode }) => children,
}));

describe("mobile workspace navigation", () => {
  beforeEach(() => {
    pathname = "/";
  });

  it("keeps everyday destinations directly available to collaborators", () => {
    render(
      <MobileNavigation
        displayName="Julio Zeledon"
        role="collaborator"
        unreadNotificationCount={2}
      />,
    );

    const navigation = screen.getByRole("navigation", {
      name: "Navegación móvil",
    });

    expect(navigation).toHaveTextContent("Inicio");
    expect(navigation).toHaveTextContent("Calendario");
    expect(navigation).toHaveTextContent("Ausencias");
    expect(screen.getByRole("button", { name: "Más" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Inicio/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("opens administrator destinations in an accessible more sheet", async () => {
    pathname = "/admin/colaboradores";
    const user = userEvent.setup();
    render(<MobileNavigation displayName="Julio Zeledon" role="administrator" />);

    const moreButton = screen.getByRole("button", { name: "Más" });
    expect(moreButton).toHaveAttribute("aria-current", "page");

    await user.click(moreButton);

    expect(screen.getByRole("dialog", { name: "Más opciones" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Colaboradores" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByText("Julio Zeledon")).toBeVisible();
    expect(screen.getByRole("link", { name: "Mi perfil" })).toHaveAttribute(
      "href",
      "/perfil",
    );

    await user.click(screen.getByRole("button", { name: "Cerrar menú" }));
    expect(document.querySelector("dialog")).not.toHaveAttribute("open");
  });
});
