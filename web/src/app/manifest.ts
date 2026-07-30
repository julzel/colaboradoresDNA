import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
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
