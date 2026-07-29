import { ConstructionPlaceholder } from "@/components/layout/construction-placeholder/construction-placeholder";
import { WorkspaceShell } from "@/components/layout/workspace-shell/workspace-shell";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";
import { getWorkspaceNavigation } from "@/features/navigation/workspace-navigation";

export default async function AdministrationPage() {
  const { platformUser } = await requirePlatformUser({
    roles: ["administrator"],
  });

  return (
    <WorkspaceShell
      breadcrumbs={[{ href: "/", label: "Inicio" }, { label: "Administración" }]}
      currentHref="/admin"
      navigationItems={getWorkspaceNavigation(platformUser.role)}
    >
      <ConstructionPlaceholder
        description="Pronto encontrarás aquí las herramientas administrativas de la plataforma."
        eyebrow="Administración"
        title="Administración en construcción"
      />
    </WorkspaceShell>
  );
}
