import { ClerkProvider } from "@clerk/nextjs";
import { esCR } from "@clerk/localizations";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ToastProvider } from "@/components/ui/feedback/toast-provider";

import "@/styles/tokens.css";
import "@/styles/globals.css";

const themeScript = `
  (() => {
    const storageKey = "colaboradores-theme";
    const root = document.documentElement;

    const isTheme = (value) => value === "light" || value === "dark";

    const updateControls = (theme) => {
      document.querySelectorAll("[data-theme-option]").forEach((control) => {
        control.setAttribute(
          "aria-pressed",
          String(control.getAttribute("data-theme-option") === theme),
        );
      });
    };

    const applyTheme = (theme, persist = false) => {
      root.dataset.theme = theme;
      root.style.colorScheme = theme;
      updateControls(theme);

      if (persist) {
        window.localStorage.setItem(storageKey, theme);
      }
    };

    try {
      const savedTheme = window.localStorage.getItem(storageKey);
      const theme =
        isTheme(savedTheme)
          ? savedTheme
          : window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";

      applyTheme(theme);

      document.addEventListener("click", (event) => {
        const control =
          event.target instanceof Element
            ? event.target.closest("[data-theme-option]")
            : null;
        const selectedTheme = control?.getAttribute("data-theme-option");

        if (isTheme(selectedTheme)) {
          applyTheme(selectedTheme, true);
        }
      });

      const syncControls = () => {
        const currentTheme = root.dataset.theme;
        if (isTheme(currentTheme)) {
          updateControls(currentTheme);
        }
      };

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", syncControls, { once: true });
      } else {
        syncControls();
      }
    } catch {
      applyTheme("light");
    }
  })();
`;

export const metadata: Metadata = {
  title: {
    default: "Colaboradores DNA",
    template: "%s · Colaboradores DNA",
  },
  description: "El espacio interno para gestionar colaboradores y procesos operativos.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es-CR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ClerkProvider
          afterSignOutUrl="/sign-in"
          appearance={{
            variables: {
              borderRadius: "0.625rem",
              colorBackground: "var(--color-surface)",
              colorForeground: "var(--color-text)",
              colorInput: "var(--color-surface)",
              colorInputForeground: "var(--color-text)",
              colorMutedForeground: "var(--color-text-muted)",
              colorPrimary: "#07bbc7",
              fontFamily: "var(--font-sans)",
            },
          }}
          localization={esCR}
          signInFallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/"
        >
          <a className="skip-link" href="#main-content">
            Ir al contenido principal
          </a>
          {children}
          <ToastProvider />
        </ClerkProvider>
      </body>
    </html>
  );
}
