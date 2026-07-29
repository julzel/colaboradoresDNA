import { SignOutButton } from "@clerk/nextjs";
import Link from "next/link";

import { Button } from "@/components/ui/button/button";

const messages = {
  deactivated: {
    description:
      "Tu cuenta está desactivada. Contactá a una persona administradora si necesitás recuperar el acceso.",
    title: "Tu acceso está desactivado.",
  },
  forbidden: {
    description:
      "Tu cuenta está activa, pero no tiene permiso para entrar a esta sección.",
    title: "No tenés permiso para ver esta página.",
  },
  invitation_pending: {
    description:
      "Completá el registro desde el enlace más reciente que recibiste por correo.",
    title: "La invitación todavía está pendiente.",
  },
  not_invited: {
    description:
      "Este espacio es privado. Solicitá una invitación a una persona administradora.",
    title: "Esta cuenta no tiene una invitación válida.",
  },
} as const;

export default async function AccessDeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const message = messages[reason as keyof typeof messages] ?? messages.not_invited;

  return (
    <main className="error-page" id="main-content">
      <p className="eyebrow">Acceso restringido</p>
      <h1>{message.title}</h1>
      <p>{message.description}</p>
      <div>
        <SignOutButton redirectUrl="/sign-in">
          <Button>Cerrar sesión</Button>
        </SignOutButton>{" "}
        <Link href="/sign-in">Volver al inicio de sesión</Link>
      </div>
    </main>
  );
}
