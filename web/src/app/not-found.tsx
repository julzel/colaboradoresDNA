import Link from "next/link";

import { Container } from "@/components/ui/container/container";

export default function NotFound() {
  return (
    <main className="error-page">
      <Container>
        <p className="eyebrow">404</p>
        <h1>That page is not part of the system.</h1>
        <p>Check the address or return to the Colaboradores DNA homepage.</p>
        <Link className="button button--primary" href="/">
          Return home
        </Link>
      </Container>
    </main>
  );
}
