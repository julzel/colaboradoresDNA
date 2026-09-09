"use client";

import { useEffect } from "react";

type Theme = "dark" | "light";

const storageKey = "colaboradores-theme";

function isTheme(value: string | null | undefined): value is Theme {
  return value === "light" || value === "dark";
}

function updateControls(theme: Theme) {
  const label = theme === "light" ? "Activar tema oscuro" : "Activar tema claro";

  document.querySelectorAll<HTMLElement>("[data-theme-toggle]").forEach((control) => {
    control.dataset.currentTheme = theme;
    control.setAttribute("aria-label", label);
    control.setAttribute("title", label);
  });
}

function applyTheme(theme: Theme, persist = false) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  updateControls(theme);

  if (persist) window.localStorage.setItem(storageKey, theme);
}

export function ThemeController() {
  useEffect(() => {
    let theme: Theme = "light";

    try {
      const savedTheme = window.localStorage.getItem(storageKey);
      theme = isTheme(savedTheme)
        ? savedTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    } catch {
      // Storage may be unavailable in privacy-restricted browsers.
    }

    applyTheme(theme);

    const handleClick = (event: MouseEvent) => {
      const control =
        event.target instanceof Element
          ? event.target.closest("[data-theme-toggle]")
          : null;
      if (!control) return;

      const currentTheme = isTheme(document.documentElement.dataset.theme)
        ? document.documentElement.dataset.theme
        : "light";
      applyTheme(currentTheme === "light" ? "dark" : "light", true);
    };
    const observer = new MutationObserver(() => {
      const currentTheme = document.documentElement.dataset.theme;
      if (isTheme(currentTheme)) updateControls(currentTheme);
    });

    document.addEventListener("click", handleClick);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("click", handleClick);
      observer.disconnect();
    };
  }, []);

  return null;
}
