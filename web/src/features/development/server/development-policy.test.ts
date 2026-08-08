import { beforeEach, describe, expect, it, vi } from "vitest";

import { DevelopmentDomainError } from "@/features/development/domain/shared";
import {
  assertDevelopmentResourceTarget,
  getDevelopmentAccessDecision,
  requireDevelopmentAdministrator,
  requireOwnDevelopmentSubject,
} from "@/features/development/server/development-policy";

const mocks = vi.hoisted(() => ({
  findDevelopmentEmployeeByPlatformUserId: vi.fn(),
  requirePlatformUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/features/auth/server/require-platform-user", () => ({
  requirePlatformUser: mocks.requirePlatformUser,
}));

vi.mock("@/features/development/server/development-employee-read-repository", () => ({
  findDevelopmentEmployeeByPlatformUserId:
    mocks.findDevelopmentEmployeeByPlatformUserId,
}));

const employeeId = "507f1f77bcf86cd799439011";

describe("development access policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePlatformUser.mockResolvedValue({
      clerkTwoFactorEnabled: true,
      platformUser: {
        id: "507f1f77bcf86cd799439012",
        role: "administrator",
        status: "active",
      },
    });
    mocks.findDevelopmentEmployeeByPlatformUserId.mockResolvedValue({
      employmentStatus: "active",
      id: employeeId,
    });
  });

  it("grants every explicit operation only to an active MFA-backed administrator", () => {
    expect(
      getDevelopmentAccessDecision({
        actorEmployeeId: null,
        actorMfaEnabled: true,
        actorRole: "administrator",
        actorStatus: "active",
        operation: "manage_catalog",
        targetEmployeeId: null,
      }),
    ).toEqual({ granted: true });
    expect(
      getDevelopmentAccessDecision({
        actorEmployeeId: null,
        actorMfaEnabled: false,
        actorRole: "administrator",
        actorStatus: "active",
        operation: "read_narrative",
        targetEmployeeId: employeeId,
      }),
    ).toEqual({ granted: false, reason: "mfa_required" });
  });

  it("keeps supervisors outside the MVP development audience", () => {
    expect(
      getDevelopmentAccessDecision({
        actorEmployeeId: employeeId,
        actorMfaEnabled: true,
        actorRole: "supervisor",
        actorStatus: "active",
        operation: "list",
        targetEmployeeId: employeeId,
      }),
    ).toEqual({ granted: false, reason: "forbidden" });
  });

  it("allows collaborators to read only their own shared record", () => {
    const actor = {
      actorEmployeeId: employeeId,
      actorMfaEnabled: false,
      actorRole: "collaborator" as const,
      actorStatus: "active" as const,
      operation: "read_shared" as const,
    };

    expect(
      getDevelopmentAccessDecision({ ...actor, targetEmployeeId: employeeId }),
    ).toEqual({ granted: true });
    expect(
      getDevelopmentAccessDecision({
        ...actor,
        targetEmployeeId: "507f1f77bcf86cd799439099",
      }),
    ).toEqual({ granted: false, reason: "forbidden" });
    expect(
      getDevelopmentAccessDecision({
        ...actor,
        operation: "write",
        targetEmployeeId: employeeId,
      }),
    ).toEqual({ granted: false, reason: "forbidden" });
  });

  it("rejects deactivated identities before considering role", () => {
    expect(
      getDevelopmentAccessDecision({
        actorEmployeeId: employeeId,
        actorMfaEnabled: true,
        actorRole: "administrator",
        actorStatus: "deactivated",
        operation: "list",
        targetEmployeeId: employeeId,
      }),
    ).toEqual({ granted: false, reason: "deactivated" });
  });

  it("uses the existing administrator and MFA boundary", async () => {
    await expect(requireDevelopmentAdministrator("list")).resolves.toBeDefined();
    expect(mocks.requirePlatformUser).toHaveBeenCalledWith({
      roles: ["administrator"],
    });
  });

  it("derives the self-view target from the authenticated platform user", async () => {
    mocks.requirePlatformUser.mockResolvedValue({
      clerkTwoFactorEnabled: false,
      platformUser: {
        id: "507f1f77bcf86cd799439012",
        role: "collaborator",
        status: "active",
      },
    });

    await expect(requireOwnDevelopmentSubject()).resolves.toMatchObject({
      employeeId,
    });
    expect(mocks.findDevelopmentEmployeeByPlatformUserId).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439012",
    );
  });

  it("returns one generic missing-record outcome for target mismatches", () => {
    expect(() =>
      assertDevelopmentResourceTarget({
        requestedEmployeeId: employeeId,
        resourceEmployeeId: "507f1f77bcf86cd799439099",
      }),
    ).toThrow(new DevelopmentDomainError("record_not_found"));
  });
});
