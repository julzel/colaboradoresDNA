import { act } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { toggleTheme } from "@/components/ui/theme-toggle/theme-toggle";

describe("theme toggle", () => {
  it("switches the document theme and persists the selected value", () => {
    document.documentElement.dataset.theme = "light";

    act(() => toggleTheme());

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(window.localStorage.getItem("colaboradores-theme")).toBe("dark");

    act(() => toggleTheme());

    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
