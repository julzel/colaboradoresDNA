import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/layout/workspace-shell/workspace-shell";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";

export default async function WorkspaceLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const { platformUser } = await requirePlatformUser();

  return <WorkspaceShell role={platformUser.role}>{children}</WorkspaceShell>;
}
