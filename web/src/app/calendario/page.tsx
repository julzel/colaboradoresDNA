import { ConstructionPlaceholder } from "@/components/layout/construction-placeholder/construction-placeholder";
import { WorkspaceShell } from "@/components/layout/workspace-shell/workspace-shell";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";
import { getWorkspaceNavigation } from "@/features/navigation/workspace-navigation";

export default async function CalendarPage() {
  const { platformUser } = await requirePlatformUser();

  return (
    <WorkspaceShell
      breadcrumbs={[{ href: "/", label: "Inicio" }, { label: "Calendario" }]}
      currentHref="/calendario"
      navigationItems={getWorkspaceNavigation(platformUser.role)}
    >
      <ConstructionPlaceholder
        description="Pronto podrás consultar y organizar los eventos relevantes para tu equipo."
        eyebrow="Planificación"
        title="Calendario en construcción"
      />
    </WorkspaceShell>
  );
}
