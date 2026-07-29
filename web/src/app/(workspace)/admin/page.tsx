import { ConstructionPlaceholder } from "@/components/layout/construction-placeholder/construction-placeholder";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";

export default async function AdministrationPage() {
  await requirePlatformUser({ roles: ["administrator"] });

  return (
    <ConstructionPlaceholder
      description="Pronto encontrarás aquí las herramientas administrativas de la plataforma."
      eyebrow="Administración"
      title="Administración en construcción"
    />
  );
}
