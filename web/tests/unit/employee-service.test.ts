import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createDepartmentAsAdministrator,
  getBirthdayCalendarEntries,
  updateOwnEmployeeProfile,
} from "@/features/employees/server/employee-service";

const mocks = vi.hoisted(() => ({
  createDepartment: vi.fn(),
  listBirthdayCalendarEntries: vi.fn(),
  requirePlatformUser: vi.fn(),
  updateEmployeeSelfServiceProfile: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/features/auth/server/require-platform-user", () => ({
  requirePlatformUser: mocks.requirePlatformUser,
}));

vi.mock("@/features/employees/server/department-repository", () => ({
  createDepartment: mocks.createDepartment,
  listDepartments: vi.fn(),
  setDepartmentStatus: vi.fn(),
  updateDepartment: vi.fn(),
}));

vi.mock("@/features/employees/server/employee-repository", () => ({
  createEmployee: vi.fn(),
  findEmployeeById: vi.fn(),
  findEmployeeByPlatformUserId: vi.fn(),
  listBirthdayCalendarEntries: mocks.listBirthdayCalendarEntries,
  listEmployeeDirectory: vi.fn(),
  updateEmployeeSelfServiceProfile: mocks.updateEmployeeSelfServiceProfile,
}));

vi.mock("@/features/employees/server/assignment-repository", () => ({
  createEmployeeAssignmentInSession: vi.fn(),
  replaceEmployeeAssignment: vi.fn(),
}));

vi.mock("@/features/employees/server/schedule-repository", () => ({
  createEmployeeScheduleInSession: vi.fn(),
  replaceEmployeeSchedule: vi.fn(),
}));

vi.mock("@/features/employees/server/employee-audit-repository", () => ({
  recordEmployeeAudit: vi.fn(),
}));

vi.mock("@/features/employees/server/employee-indexes", () => ({
  ensureEmployeeDomainIndexes: vi.fn(),
}));

vi.mock("@/lib/server/mongodb", () => ({
  getDatabase: vi.fn(),
  getMongoClient: vi.fn(),
}));

describe("employee service authorization boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: {
        id: "507f1f77bcf86cd799439011",
        role: "collaborator",
      },
    });
  });

  it("requires the administrator role before creating a department", async () => {
    mocks.createDepartment.mockResolvedValue({ id: "department" });

    await createDepartmentAsAdministrator({ name: "Producción" });

    expect(mocks.requirePlatformUser).toHaveBeenCalledWith({
      roles: ["administrator"],
    });
    expect(mocks.createDepartment).toHaveBeenCalledWith({
      name: "Producción",
    });
  });

  it("uses the authenticated role for birthday visibility", async () => {
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: {
        id: "507f1f77bcf86cd799439011",
        role: "administrator",
      },
    });

    await getBirthdayCalendarEntries();

    expect(mocks.listBirthdayCalendarEntries).toHaveBeenCalledWith({
      viewerRole: "administrator",
    });
  });

  it("binds self-service profile changes to the authenticated platform user", async () => {
    const input = {
      phoneNumber: "8888-7777",
      shareBirthdayOnCalendar: false,
    };

    await updateOwnEmployeeProfile(input);

    expect(mocks.updateEmployeeSelfServiceProfile).toHaveBeenCalledWith({
      actorPlatformUserId: "507f1f77bcf86cd799439011",
      input,
    });
  });
});
