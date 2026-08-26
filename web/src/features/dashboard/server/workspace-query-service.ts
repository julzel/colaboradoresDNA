import "server-only";

import { requirePlatformUser } from "@/features/auth/server/require-platform-user";
import { getCalendarDashboardUnreadCount } from "@/features/calendar/server/calendar-service";
import { formatEmployeePreferredDisplayName } from "@/features/employees/domain/employee";
import { findEmployeeByPlatformUserId } from "@/features/employees/server/employee-repository";

export async function getWorkspaceShellData() {
  const { clerkHasImage, clerkImageUrl, platformUser } = await requirePlatformUser();
  const [employee, unreadNotificationCount] = await Promise.all([
    findEmployeeByPlatformUserId(platformUser.id),
    getCalendarDashboardUnreadCount(platformUser.id),
  ]);

  return {
    displayName: employee
      ? formatEmployeePreferredDisplayName(employee)
      : platformUser.displayName,
    profileImageUrl: clerkHasImage ? clerkImageUrl : null,
    role: platformUser.role,
    unreadNotificationCount,
  };
}
