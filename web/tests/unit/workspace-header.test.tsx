import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceHeader } from "@/components/layout/workspace-header/workspace-header";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("@/components/auth/auth-controls", () => ({
  AuthControls: () => <span>Cuenta</span>,
}));
vi.mock("@/components/brand/logo/logo", () => ({ Logo: () => <span>DNA</span> }));
vi.mock("@/components/pwa/pwa-install-button", () => ({
  PwaInstallButton: () => null,
}));

describe("workspace header notifications", () => {
  it("renders the unread badge on the bell control", () => {
    render(
      <WorkspaceHeader
        displayName="Ana Mora"
        profileImageUrl={null}
        unreadNotificationCount={3}
      />,
    );

    const notifications = screen.getByRole("link", {
      name: "3 notificaciones sin leer",
    });
    expect(notifications).toHaveAttribute("href", "/#notifications");
    expect(notifications).toHaveTextContent("3");
  });
});
