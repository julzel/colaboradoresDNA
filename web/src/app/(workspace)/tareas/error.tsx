"use client";
import { Button } from "@/components/ui/button/button";
import { Container } from "@/components/ui/container/container";
export default function TasksError({ reset }: { reset: () => void }) {
  return (
    <Container>
      <h1>No pudimos cargar las tareas</h1>
      <p>Tu información no se ha modificado. Intentá de nuevo.</p>
      <Button onClick={reset}>Reintentar</Button>
    </Container>
  );
}
