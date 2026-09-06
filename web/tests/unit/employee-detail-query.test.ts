import { beforeEach, describe, expect, it, vi } from "vitest";

import { getEmployeeDetailPageData } from "@/features/employees/server/employee-query-service";

const mocks = vi.hoisted(() => ({
  getDevelopmentSummaryForAdministration: vi.fn(),
  getEmployeeDetailForAdministration: vi.fn(),
  hasAnySchedule: vi.fn(),
  requirePlatformUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: vi.fn() }));
vi.mock("@/features/auth/server/require-platform-user", () => ({
  requirePlatformUser: mocks.requirePlatformUser,
}));
vi.mock("@/features/development/server/development-service", () => ({
  getDevelopmentSummaryForAdministration: mocks.getDevelopmentSummaryForAdministration,
}));
vi.mock("@/features/employees/server/department-repository", () => ({
  listDepartments: vi.fn(),
}));
vi.mock("@/features/employees/server/employee-repository", () => ({
  findEmployeeById: vi.fn(),
}));
vi.mock("@/features/employees/server/employee-read-repository", () => ({
  getEmployeeDetailForAdministration: mocks.getEmployeeDetailForAdministration,
  listEligibleManagerOptions: vi.fn(),
  listEmployeeDirectoryForAdministration: vi.fn(),
}));
vi.mock("@/features/scheduling/integrations/employee-scheduling-adapter", () => ({
  employeeSchedulingIntegration: {
    hasAnySchedule: mocks.hasAnySchedule,
  },
}));

describe("employee detail setup status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: { id: "507f1f77bcf86cd799439011", role: "administrator" },
    });
    mocks.getDevelopmentSummaryForAdministration.mockResolvedValue(null);
    mocks.getEmployeeDetailForAdministration.mockResolvedValue({
      access: { clerkUserId: null },
      employee: { id: "507f1f77bcf86cd799439012" },
    });
  });

  it("reports a missing schedule independently from employee profile data", async () => {
    mocks.hasAnySchedule.mockResolvedValue(false);

    await expect(
      getEmployeeDetailPageData("507f1f77bcf86cd799439012"),
    ).resolves.toMatchObject({ hasSchedule: false });
    expect(mocks.hasAnySchedule).toHaveBeenCalledWith("507f1f77bcf86cd799439012");
  });
});
