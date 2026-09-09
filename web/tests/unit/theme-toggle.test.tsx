import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { ThemeController } from "@/components/ui/theme-toggle/theme-controller";
import { toggleTheme } from "@/components/ui/theme-toggle/theme-toggle";

describe("theme toggle", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
    document.documentElement.style.colorScheme = "";
  });

  it("switches the document theme and persists the selected value", () => {
    document.documentElement.dataset.theme = "light";

    act(() => toggleTheme());

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(window.localStorage.getItem("colaboradores-theme")).toBe("dark");

    act(() => toggleTheme());

    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("restores a saved theme and updates controls without injecting scripts", async () => {
    window.localStorage.setItem("colaboradores-theme", "dark");
    render(
      <>
        <ThemeController />
        <button data-theme-toggle>Theme</button>
      </>,
    );

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      "Activar tema claro",
    );
    expect(document.querySelector("script")).not.toBeInTheDocument();
  });
});
