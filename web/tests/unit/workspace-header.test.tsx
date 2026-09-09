import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceHeader } from "@/components/layout/workspace-header/workspace-header";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/features/dashboard/actions/dashboard-notification-actions", () => ({
  getUnreadNotificationsAction: vi.fn(),
  markNotificationReadAction: vi.fn(),
}));
vi.mock("@/components/auth/auth-controls", () => ({
  AuthControls: ({ profileImageUrl }: { profileImageUrl?: string | null }) => (
    <span data-profile-image-url={profileImageUrl ?? ""}>Cuenta</span>
  ),
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

    const notifications = screen.getByRole("button", {
      name: "3 notificaciones sin leer",
    });
    expect(notifications).toHaveAttribute("aria-haspopup", "dialog");
    expect(notifications).toHaveTextContent("3");
  });

  it("passes the profile image to the desktop account control", () => {
    render(
      <WorkspaceHeader
        displayName="Ana Mora"
        profileImageUrl="/api/profile-images/auth-user?v=1"
        unreadNotificationCount={0}
      />,
    );

    expect(screen.getByText("Cuenta")).toHaveAttribute(
      "data-profile-image-url",
      "/api/profile-images/auth-user?v=1",
    );
  });
});
