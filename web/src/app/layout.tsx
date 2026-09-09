import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { PwaRegistration } from "@/components/pwa/pwa-registration";
import { PwaInstallProvider } from "@/components/pwa/pwa-install-provider";
import { ToastProvider } from "@/components/ui/feedback/toast-provider";
import { ThemeController } from "@/components/ui/theme-toggle/theme-controller";

import "@/styles/tokens.css";
import "@/styles/globals.css";

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
      <body>
        <PwaInstallProvider>
          <ThemeController />
          <a className="skip-link" href="#main-content">
            Ir al contenido principal
          </a>
          {children}
          <PwaRegistration />
          <ToastProvider />
        </PwaInstallProvider>
      </body>
    </html>
  );
}
