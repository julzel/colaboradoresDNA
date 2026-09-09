import type { ReactNode } from "react";
import { NotificationRefresh } from "@/features/dashboard/components/notification-refresh";

import { WorkspaceShell } from "@/components/layout/workspace-shell/workspace-shell";
import { getWorkspaceShellData } from "@/features/dashboard/server/workspace-query-service";

export default async function WorkspaceLayout({
  children,
  modal,
}: Readonly<{ children: ReactNode; modal?: ReactNode }>) {
  const workspace = await getWorkspaceShellData();

  return (
    <>
      <NotificationRefresh />
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
