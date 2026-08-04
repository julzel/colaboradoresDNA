import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PwaInstallButton } from "@/components/pwa/pwa-install-button";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn() }),
}));

describe("PWA installation", () => {
  it("offers the native install prompt and hides after acceptance", async () => {
    const user = userEvent.setup();
    const prompt = vi.fn().mockResolvedValue(undefined);
    const installEvent = new Event("beforeinstallprompt", { cancelable: true });
    Object.defineProperties(installEvent, {
      prompt: { value: prompt },
      userChoice: {
        value: Promise.resolve({ outcome: "accepted", platform: "web" }),
      },
    });

    render(<PwaInstallButton />);

    act(() => {
      window.dispatchEvent(installEvent);
    });

    const installButton = screen.getByRole("button", {
      name: "Instalar aplicación",
    });
    await user.click(installButton);

    expect(prompt).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Instalar aplicación" }),
      ).not.toBeInTheDocument();
    });
  });
});
