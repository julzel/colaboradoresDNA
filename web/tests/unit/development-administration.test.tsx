import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdministrationPage from "@/app/(workspace)/admin/page";
import DevelopmentAdministrationPage from "@/app/(workspace)/admin/desarrollo/page";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";
import { getDevelopmentDirectoryForAdministration } from "@/features/development/server/development-service";

vi.mock("@/features/auth/server/require-platform-user", () => ({
  requirePlatformUser: vi.fn().mockResolvedValue({ role: "administrator" }),
}));

vi.mock("@/features/development/server/development-service", () => ({
  getDevelopmentDirectoryForAdministration: vi.fn().mockResolvedValue({
    items: [],
    today: "2026-08-07",
  }),
}));

describe("development administration entry points", () => {
  beforeEach(() => {
    vi.mocked(requirePlatformUser).mockClear();
    vi.mocked(getDevelopmentDirectoryForAdministration).mockClear();
  });

  it("exposes Desarrollo from the administration module hub", async () => {
    render(await AdministrationPage());

    expect(screen.getByRole("link", { name: /Desarrollo/ })).toHaveAttribute(
      "href",
      "/admin/desarrollo",
    );
    expect(requirePlatformUser).toHaveBeenCalledWith({ roles: ["administrator"] });
  });

  it("guards the module route before rendering its first-run state", async () => {
    render(await DevelopmentAdministrationPage());

    expect(getDevelopmentDirectoryForAdministration).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Desarrollo" }),
    ).toBeInTheDocument();
  });
});
