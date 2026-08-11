import type { Metadata } from "next";

import { Container } from "@/components/ui/container/container";
import { DevelopmentDashboardShell } from "@/features/development/components/development-dashboard-shell";
import { getDevelopmentDirectoryForAdministration } from "@/features/development/server/development-service";

export const metadata: Metadata = { title: "Desarrollo" };

export default async function DevelopmentAdministrationPage() {
  const directory = await getDevelopmentDirectoryForAdministration();

  return (
    <Container>
      <DevelopmentDashboardShell directory={directory} />
    </Container>
  );
}
