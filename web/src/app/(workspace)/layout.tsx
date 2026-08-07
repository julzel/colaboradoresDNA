import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/layout/workspace-shell/workspace-shell";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";
import { getCalendarDashboardUnreadCount } from "@/features/calendar/server/calendar-service";
import { formatEmployeePreferredDisplayName } from "@/features/employees/domain/employee";
import { findEmployeeByPlatformUserId } from "@/features/employees/server/employee-repository";
import { getDashboardGreeting } from "@/features/dashboard/domain/dashboard-greeting";

export default async function WorkspaceLayout({
  children,
  modal,
}: Readonly<{ children: ReactNode; modal?: ReactNode }>) {
  const { platformUser } = await requirePlatformUser();
  const [employee, unreadNotificationCount] = await Promise.all([
    findEmployeeByPlatformUserId(platformUser.id),
    getCalendarDashboardUnreadCount(platformUser.id),
  ]);
  const displayName = employee
    ? formatEmployeePreferredDisplayName(employee)
    : platformUser.displayName;
  const greeting = getDashboardGreeting();

  return (
    <>
      <WorkspaceShell
        displayName={displayName}
        greeting={greeting}
        role={platformUser.role}
        unreadNotificationCount={unreadNotificationCount}
      >
        {children}
      </WorkspaceShell>
      {modal}
    </>
  );
}
