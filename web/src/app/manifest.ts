import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Colaboradores DNA",
    short_name: "Colaboradores",
    description:
      "El espacio interno para gestionar colaboradores y procesos operativos.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f3f7f7",
    theme_color: "#07bbc7",
    lang: "es-CR",
    categories: ["business", "productivity"],
    prefer_related_applications: false,
    shortcuts: [
      {
        name: "Calendario",
        short_name: "Calendario",
        description: "Abrir el calendario de la empresa",
        url: "/calendario",
      },
      {
        name: "Solicitudes de ausencia",
        short_name: "Ausencias",
        description: "Consultar solicitudes de ausencia",
        url: "/ausencias",
      },
      {
        name: "Mi perfil",
        short_name: "Mi perfil",
        description: "Abrir mi perfil",
        url: "/perfil",
      },
    ],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
