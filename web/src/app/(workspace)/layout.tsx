import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/layout/workspace-shell/workspace-shell";
import { getDashboardGreeting } from "@/features/dashboard/domain/dashboard-greeting";
import { getWorkspaceShellData } from "@/features/dashboard/server/workspace-query-service";

export default async function WorkspaceLayout({
  children,
  modal,
}: Readonly<{ children: ReactNode; modal?: ReactNode }>) {
  const workspace = await getWorkspaceShellData();
  const greeting = getDashboardGreeting();

  return (
    <>
      <WorkspaceShell
        displayName={workspace.displayName}
        greeting={greeting}
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
