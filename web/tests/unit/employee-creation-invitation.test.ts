import { beforeEach, describe, expect, it, vi } from "vitest";

import { createEmployeeForAdministration } from "@/features/employees/server/employee-administration-service";

const mocks = vi.hoisted(() => ({
  createEmployeeWithAccess: vi.fn(),
  recordAuthAudit: vi.fn(),
  safelySendPlatformInvitation: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: vi.fn() }));
vi.mock("@/features/auth/server/auth-audit-repository", () => ({
  recordAuthAudit: mocks.recordAuthAudit,
}));
vi.mock("@/features/auth/server/invitation-service", () => ({
  safelySendPlatformInvitation: mocks.safelySendPlatformInvitation,
  sendPlatformInvitation: vi.fn(),
}));
vi.mock("@/features/employees/server/employee-service", () => ({
  createEmployeeWithAccess: mocks.createEmployeeWithAccess,
}));

const input = {
  access: { email: "ana@example.com", role: "collaborator" as const },
  assignment: {
    departmentId: "507f1f77bcf86cd799439014",
    effectiveFrom: "2026-08-01",
    effectiveTo: null,
    managerEmployeeId: null,
    positionTitle: "Empacadora",
  },
  employee: {
    birthDay: 1,
    birthMonth: 1,
    employmentEndedOn: null,
    employmentStartedOn: "2026-08-01",
    employmentStatus: "active" as const,
    firstSurname: "Mora",
    givenNames: "Ana",
    identification: { type: "national_id" as const, value: "1-0111-0111" },
    phoneNumber: null,
    secondSurname: null,
    shareBirthdayOnCalendar: false,
  },
  openingPtoBalanceUnits: 10,
};

describe("employee creation invitation choice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createEmployeeWithAccess.mockResolvedValue({
      actor: {
        clerkUserId: "clerk_admin",
        id: "507f1f77bcf86cd799439011",
      },
      employee: { id: "507f1f77bcf86cd799439013" },
      platformUser: {
        id: "507f1f77bcf86cd799439012",
        normalizedEmail: "ana@example.com",
        role: "collaborator",
      },
    });
  });

  it("creates the collaborator without contacting the invitation provider", async () => {
    await expect(
      createEmployeeForAdministration({ ...input, sendInvitation: false }),
    ).resolves.toEqual({
      employeeId: "507f1f77bcf86cd799439013",
      invitationDisposition: "deferred",
    });

    expect(mocks.safelySendPlatformInvitation).not.toHaveBeenCalled();
    expect(mocks.recordAuthAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "invitation_deferred" }),
    );
  });

  it("sends the invitation only when the administrator requests it", async () => {
    mocks.safelySendPlatformInvitation.mockResolvedValue(true);

    await expect(
      createEmployeeForAdministration({ ...input, sendInvitation: true }),
    ).resolves.toEqual({
      employeeId: "507f1f77bcf86cd799439013",
      invitationDisposition: "sent",
    });

    expect(mocks.safelySendPlatformInvitation).toHaveBeenCalledWith({
      email: "ana@example.com",
      platformUserId: "507f1f77bcf86cd799439012",
    });
  });
});
