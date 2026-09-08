import type { Metadata } from "next";
import { Container } from "@/components/ui/container/container";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";
import { PlanningWorkspace } from "@/features/planning/components/planning-workspace";

export const metadata: Metadata = { title: "Mis prioridades" };
export default async function PlanningPage() {
  await requirePlatformUser({ roles: ["administrator"] });
  return (
    <Container>
      <PlanningWorkspace />
    </Container>
  );
}
