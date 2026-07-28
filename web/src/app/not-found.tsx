import { ButtonLink } from "@/components/ui/button/button";

export default function NotFound() {
  return (
    <main className="error-page">
      <div>
        <p className="eyebrow">404</p>
        <h1>That page is not part of the system.</h1>
        <p>Check the address or return to the Colaboradores DNA homepage.</p>
        <ButtonLink href="/">Return home</ButtonLink>
      </div>
    </main>
  );
}
