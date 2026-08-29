import type { Metadata } from "next";

import { AdministratorModuleLinks } from "@/components/admin/administrator-module-links/administrator-module-links";
import { Container } from "@/components/ui/container/container";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";

export const metadata: Metadata = { title: "Administración" };

export default async function AdministrationPage() {
  await requirePlatformUser({ roles: ["administrator"] });

  return (
    <Container>
      <AdministratorModuleLinks titleAs="h1" />
    </Container>
  );
}
