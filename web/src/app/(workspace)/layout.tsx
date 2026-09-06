import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/layout/workspace-shell/workspace-shell";
import { getWorkspaceShellData } from "@/features/dashboard/server/workspace-query-service";

export default async function WorkspaceLayout({
  children,
  modal,
}: Readonly<{ children: ReactNode; modal?: ReactNode }>) {
  const workspace = await getWorkspaceShellData();

  return (
    <>
      <WorkspaceShell
        displayName={workspace.displayName}
        profileImageUrl={workspace.profileImageUrl}
        role={workspace.role}
        unreadNotificationCount={workspace.unreadNotificationCount}
      >
        {children}
      </WorkspaceShell>
      {modal}
    </>
  );
}
