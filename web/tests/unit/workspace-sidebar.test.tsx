import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WorkspaceShell } from "@/components/layout/workspace-shell/workspace-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("@/components/brand/logo/logo", () => ({
  Logo: () => <span>DNA</span>,
}));

vi.mock("@/components/layout/workspace-header/workspace-header", () => ({
  WorkspaceHeader: () => <header>Encabezado</header>,
}));

vi.mock("@/components/layout/mobile-navigation/mobile-navigation", () => ({
  MobileNavigation: () => null,
}));

const shellProps = {
  displayName: "Ana Rodríguez",
  greeting: { label: "Buenos días", period: "morning" } as const,
  profileImageUrl: null,
  role: "administrator" as const,
  unreadNotificationCount: 0,
};

describe("desktop workspace sidebar", () => {
  beforeEach(() => {
    window.localStorage.removeItem("colaboradores-sidebar-expanded");
  });

  it("expands accessibly and persists the preference", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <WorkspaceShell {...shellProps}>Contenido</WorkspaceShell>,
    );

    const expandButton = screen.getByRole("button", {
      name: "Expandir navegación",
    });

    expect(screen.queryByText("Espacio de trabajo")).not.toBeInTheDocument();
    expect(screen.queryByText("Administración")).not.toBeInTheDocument();
    expect(expandButton).toHaveAttribute("aria-expanded", "false");
    expect(expandButton).toHaveAttribute("aria-controls", "workspace-sidebar");

    await user.click(expandButton);

    expect(screen.getByRole("button", { name: "Contraer navegación" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(window.localStorage.getItem("colaboradores-sidebar-expanded")).toBe("true");

    unmount();
    render(<WorkspaceShell {...shellProps}>Contenido</WorkspaceShell>);

    expect(screen.getByRole("button", { name: "Contraer navegación" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });
});
