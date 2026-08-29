import { ClerkProvider } from "@clerk/nextjs";
import { esCR } from "@clerk/localizations";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { PwaRegistration } from "@/components/pwa/pwa-registration";
import { ToastProvider } from "@/components/ui/feedback/toast-provider";

import "@/styles/tokens.css";
import "@/styles/globals.css";

const themeScript = `
  (() => {
    const storageKey = "colaboradores-theme";
    const root = document.documentElement;

    const isTheme = (value) => value === "light" || value === "dark";

    const updateControls = (theme) => {
      document.querySelectorAll("[data-theme-toggle]").forEach((control) => {
        const label =
          theme === "light" ? "Activar tema oscuro" : "Activar tema claro";

        control.setAttribute("data-current-theme", theme);
        control.setAttribute("aria-label", label);
        control.setAttribute("title", label);
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
            ? event.target.closest("[data-theme-toggle]")
            : null;

        if (control) {
          const currentTheme = isTheme(root.dataset.theme)
            ? root.dataset.theme
            : "light";
          applyTheme(currentTheme === "light" ? "dark" : "light", true);
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
  applicationName: "Colaboradores DNA",
  title: {
    default: "Colaboradores DNA",
    template: "%s · Colaboradores DNA",
  },
  description: "El espacio interno para gestionar colaboradores y procesos operativos.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Colaboradores DNA",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { color: "#f7f5ef", media: "(prefers-color-scheme: light)" },
    { color: "#061614", media: "(prefers-color-scheme: dark)" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html data-scroll-behavior="smooth" lang="es-CR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ClerkProvider
          afterSignOutUrl="/sign-in"
          appearance={{
            variables: {
              borderRadius: "0.75rem",
              colorBackground: "var(--color-surface)",
              colorForeground: "var(--color-text)",
              colorInput: "var(--color-surface)",
              colorInputForeground: "var(--color-text)",
              colorMutedForeground: "var(--color-text-muted)",
              colorPrimary: "#31c7cf",
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
          <PwaRegistration />
          <ToastProvider />
        </ClerkProvider>
      </body>
    </html>
  );
}
