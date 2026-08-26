import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdministratorModuleLinks } from "@/components/admin/administrator-module-links/administrator-module-links";

describe("administrator module links", () => {
  it("exposes every administration module from one section", () => {
    render(<AdministratorModuleLinks />);

    expect(
      screen.getByRole("region", { name: "Módulos de administración" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Colaboradores/ })).toHaveAttribute(
      "href",
      "/admin/colaboradores",
    );
    expect(screen.getByRole("link", { name: /Aprobar ausencias/ })).toHaveAttribute(
      "href",
      "/admin/ausencias",
    );
    expect(screen.getByRole("link", { name: /Desarrollo/ })).toHaveAttribute(
      "href",
      "/admin/desarrollo",
    );
    expect(screen.getByRole("link", { name: /Cuentas y acceso/ })).toHaveAttribute(
      "href",
      "/admin/accounts",
    );
  });
});
