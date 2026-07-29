import { ButtonLink } from "@/components/ui/button/button";

export default function NotFound() {
  return (
    <main className="error-page">
      <div>
        <p className="eyebrow">404</p>
        <h1>Esta página no forma parte del sistema.</h1>
        <p>Revisá la dirección o regresá al inicio de Colaboradores DNA.</p>
        <ButtonLink href="/">Regresar al inicio</ButtonLink>
      </div>
    </main>
  );
}
