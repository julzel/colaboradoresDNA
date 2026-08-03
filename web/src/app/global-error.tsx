"use client";

import { Button } from "@/components/ui/button/button";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html data-scroll-behavior="smooth" lang="es-CR">
      <body>
        <main className="error-page">
          <p className="eyebrow">Ocurrió un error</p>
          <h1>No pudimos cargar esta página.</h1>
          <p>Intentá de nuevo. Si el problema continúa, regresá en unos minutos.</p>
          <Button onClick={reset}>Intentar de nuevo</Button>
        </main>
      </body>
    </html>
  );
}
