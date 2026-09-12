const areaColors: Record<string, string> = {
  cocinado: "cocinado",
  congelado: "congelado",
  "deshidratado y suplementos": "deshidratado",
  etiquetado: "etiquetado",
  "cuarto frio": "cuarto-frio",
  "materia prima": "materia-prima",
  rutas: "rutas",
  inventario: "inventario",
};

export function getAreaColor(name: string) {
  const normalized = name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ");
  return areaColors[normalized] ?? "default";
}
