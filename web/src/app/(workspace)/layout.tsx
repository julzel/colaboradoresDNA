import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/layout/workspace-shell/workspace-shell";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";
import { formatEmployeePreferredDisplayName } from "@/features/employees/domain/employee";
import { findEmployeeByPlatformUserId } from "@/features/employees/server/employee-repository";

export default async function WorkspaceLayout({
  children,
  modal,
}: Readonly<{ children: ReactNode; modal?: ReactNode }>) {
  const { platformUser } = await requirePlatformUser();
  const employee = await findEmployeeByPlatformUserId(platformUser.id);
  const displayName = employee
    ? formatEmployeePreferredDisplayName(employee)
    : platformUser.displayName;

  return (
    <>
      <WorkspaceShell displayName={displayName} role={platformUser.role}>
        {children}
      </WorkspaceShell>
      {modal}
    </>
  );
}
