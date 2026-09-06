import { beforeEach, describe, expect, it, vi } from "vitest";

import { createEmployeeWithAccess } from "@/features/employees/server/employee-service";

const mocks = vi.hoisted(() => ({
  createEmployee: vi.fn(),
  createEmployeeAssignmentInSession: vi.fn(),
  createEmployeeScheduleInSession: vi.fn(),
  createInvitedPlatformUser: vi.fn(),
  createOpeningPtoBalanceInSession: vi.fn(),
  ensureAuthIndexes: vi.fn(),
  ensureEmployeeDomainIndexes: vi.fn(),
  ensurePtoIndexes: vi.fn(),
  getMongoClient: vi.fn(),
  recordEmployeeAudit: vi.fn(),
  requirePlatformUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/features/auth/server/require-platform-user", () => ({
  requirePlatformUser: mocks.requirePlatformUser,
}));

vi.mock("@/features/auth/server/platform-user-repository", () => ({
  createInvitedPlatformUser: mocks.createInvitedPlatformUser,
  ensureAuthIndexes: mocks.ensureAuthIndexes,
}));

vi.mock("@/features/employees/server/assignment-repository", () => ({
  createEmployeeAssignmentInSession: mocks.createEmployeeAssignmentInSession,
  replaceEmployeeAssignment: vi.fn(),
}));

vi.mock("@/features/employees/server/department-repository", () => ({
  createDepartment: vi.fn(),
  listDepartments: vi.fn(),
  setDepartmentStatus: vi.fn(),
  updateDepartment: vi.fn(),
}));

vi.mock("@/features/employees/server/employee-audit-repository", () => ({
  recordEmployeeAudit: mocks.recordEmployeeAudit,
}));

vi.mock("@/features/employees/server/employee-indexes", () => ({
  ensureEmployeeDomainIndexes: mocks.ensureEmployeeDomainIndexes,
}));

vi.mock("@/features/employees/server/employee-repository", () => ({
  createEmployee: mocks.createEmployee,
  findEmployeeById: vi.fn(),
  listBirthdayCalendarEntries: vi.fn(),
  listEmployeeDirectory: vi.fn(),
  updateEmployeePersonalInformation: vi.fn(),
  updateEmployeeSelfServiceProfile: vi.fn(),
}));

vi.mock("@/features/employees/server/employee-read-repository", () => ({
  getEmployeeSelfServiceProfileDetail: vi.fn(),
}));

vi.mock("@/features/employees/server/schedule-repository", () => ({
  createEmployeeScheduleInSession: mocks.createEmployeeScheduleInSession,
  replaceEmployeeSchedule: vi.fn(),
}));

vi.mock("@/features/pto/server/pto-indexes", () => ({
  ensurePtoIndexes: mocks.ensurePtoIndexes,
}));

vi.mock("@/features/pto/server/pto-repository", () => ({
  createOpeningPtoBalanceInSession: mocks.createOpeningPtoBalanceInSession,
}));

vi.mock("@/lib/server/mongodb", () => ({
  getDatabase: vi.fn(),
  getMongoClient: mocks.getMongoClient,
}));

describe("employee creation PTO balance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const session = {
      withTransaction: vi.fn(async (callback: () => Promise<void>) => callback()),
    };
    mocks.getMongoClient.mockResolvedValue({
      withSession: async (callback: (value: typeof session) => Promise<unknown>) =>
        callback(session),
    });
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: { id: "507f1f77bcf86cd799439011" },
    });
    mocks.createInvitedPlatformUser.mockResolvedValue({
      id: "507f1f77bcf86cd799439012",
    });
    mocks.createEmployee.mockResolvedValue({
      id: "507f1f77bcf86cd799439013",
      platformUserId: "507f1f77bcf86cd799439012",
    });
  });

  it("opens the balance without creating a schedule in the employee transaction", async () => {
    await createEmployeeWithAccess({
      access: { email: "ana@example.com", role: "collaborator" },
      assignment: {
        departmentId: "507f1f77bcf86cd799439014",
        effectiveFrom: "2026-08-01",
        effectiveTo: null,
        managerEmployeeId: "507f1f77bcf86cd799439015",
        positionTitle: "Empacadora",
      },
      employee: {
        birthDay: 1,
        birthMonth: 1,
        employmentEndedOn: null,
        employmentStartedOn: "2026-08-01",
        employmentStatus: "active",
        firstSurname: "Mora",
        givenNames: "Ana",
        identification: { type: "national_id", value: "101110111" },
        phoneNumber: null,
        secondSurname: null,
        shareBirthdayOnCalendar: false,
      },
      openingPtoBalanceUnits: 10,
    });

    expect(mocks.createOpeningPtoBalanceInSession).toHaveBeenCalledWith(
      expect.objectContaining({
        actorPlatformUserId: "507f1f77bcf86cd799439011",
        employeeId: "507f1f77bcf86cd799439013",
        openingBalanceUnits: 10,
      }),
    );
    expect(mocks.createEmployeeScheduleInSession).not.toHaveBeenCalled();
  });
});
