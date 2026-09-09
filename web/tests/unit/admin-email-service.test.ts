import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AdminEmailUpdateError,
  updateEmployeeEmailAsAdministrator,
} from "@/features/auth/server/admin-email-service";

const mocks = vi.hoisted(() => ({
  updateManagedIdentityEmail: vi.fn(),
  createEmailAddress: vi.fn(),
  deleteEmailAddress: vi.fn(),
  findEmployeeById: vi.fn(),
  findPlatformUserByEmail: vi.fn(),
  findPlatformUserById: vi.fn(),
  getUser: vi.fn(),
  recordAuthAudit: vi.fn(),
  requirePlatformUser: vi.fn(),
  revokeInvitation: vi.fn(),
  safelySendPlatformInvitation: vi.fn(),
  updateEmailAddress: vi.fn(),
  updatePlatformUserEmail: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/features/auth/server/identity-administration", () => ({
  updateManagedIdentityEmail: mocks.updateManagedIdentityEmail,
}));

vi.mock("@/features/auth/server/auth-audit-repository", () => ({
  recordAuthAudit: mocks.recordAuthAudit,
}));

vi.mock("@/features/auth/server/platform-user-repository", () => ({
  findPlatformUserByEmail: mocks.findPlatformUserByEmail,
  findPlatformUserById: mocks.findPlatformUserById,
  updatePlatformUserEmail: mocks.updatePlatformUserEmail,
}));

vi.mock("@/features/auth/server/require-platform-user", () => ({
  requirePlatformUser: mocks.requirePlatformUser,
}));

vi.mock("@/features/auth/server/invitation-service", () => ({
  safelySendPlatformInvitation: mocks.safelySendPlatformInvitation,
}));

vi.mock("@/features/employees/server/employee-repository", () => ({
  findEmployeeById: mocks.findEmployeeById,
}));

const actorId = "507f1f77bcf86cd799439011";
const targetId = "507f1f77bcf86cd799439012";
const employeeId = "507f1f77bcf86cd799439013";

function activeTarget() {
  return {
    authUserId: "user_target",
    id: targetId,
    invitation: { invitationId: null },
    normalizedEmail: "old@example.com",
    status: "active",
  };
}

describe("administrator email updates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePlatformUser.mockResolvedValue({
      authUserId: "user_admin",
      platformUser: { id: actorId, role: "administrator" },
    });
    mocks.findEmployeeById.mockResolvedValue({
      id: employeeId,
      platformUserId: targetId,
    });
    mocks.findPlatformUserById.mockResolvedValue(activeTarget());
    mocks.findPlatformUserByEmail.mockResolvedValue(null);
    mocks.getUser.mockResolvedValue({
      emailAddresses: [{ emailAddress: "old@example.com", id: "idn_old" }],
      primaryEmailAddressId: "idn_old",
    });
    mocks.createEmailAddress.mockResolvedValue({ id: "idn_new" });
    mocks.updatePlatformUserEmail.mockResolvedValue(activeTarget());
    mocks.updateManagedIdentityEmail.mockResolvedValue(undefined);
  });

  it("requires an administrator and synchronizes the active identity transactionally", async () => {
    await expect(
      updateEmployeeEmailAsAdministrator({
        email: "New@Example.com",
        employeeId,
      }),
    ).resolves.toEqual({ changed: true, invitationSent: true });

    expect(mocks.requirePlatformUser).toHaveBeenCalledWith({
      roles: ["administrator"],
    });
    expect(mocks.updateManagedIdentityEmail).toHaveBeenCalledWith(
      "user_target",
      targetId,
      "new@example.com",
    );
    expect(mocks.recordAuthAudit).toHaveBeenCalledWith({
      action: "email_updated",
      actorAuthUserId: "user_admin",
      actorPlatformUserId: actorId,
      metadata: {
        invitationDeferred: false,
        invitationSent: true,
        status: "active",
      },
      targetPlatformUserId: targetId,
    });
  });

  it("rejects an email owned by another platform account before changing identity", async () => {
    mocks.findPlatformUserByEmail.mockResolvedValue({ id: "other_account" });

    await expect(
      updateEmployeeEmailAsAdministrator({
        email: "taken@example.com",
        employeeId,
      }),
    ).rejects.toEqual(new AdminEmailUpdateError("email_exists"));
    expect(mocks.updateManagedIdentityEmail).not.toHaveBeenCalled();
    expect(mocks.updatePlatformUserEmail).not.toHaveBeenCalled();
  });

  it("reports identity sync failure without recording a successful audit", async () => {
    mocks.updateManagedIdentityEmail.mockRejectedValue(
      new Error("database unavailable"),
    );

    await expect(
      updateEmployeeEmailAsAdministrator({
        email: "new@example.com",
        employeeId,
      }),
    ).rejects.toEqual(new AdminEmailUpdateError("identity_sync_failed"));

    expect(mocks.recordAuthAudit).not.toHaveBeenCalled();
  });

  it("cannot be called without passing the administrator authorization guard", async () => {
    mocks.requirePlatformUser.mockRejectedValue(new Error("forbidden"));

    await expect(
      updateEmployeeEmailAsAdministrator({
        email: "new@example.com",
        employeeId,
      }),
    ).rejects.toThrow("forbidden");
    expect(mocks.findEmployeeById).not.toHaveBeenCalled();
    expect(mocks.updateManagedIdentityEmail).not.toHaveBeenCalled();
  });

  it("updates an invited account and replaces its invitation", async () => {
    mocks.findPlatformUserById.mockResolvedValue({
      ...activeTarget(),
      authUserId: null,
      invitation: { invitationId: "inv_old" },
      status: "invited",
    });
    mocks.safelySendPlatformInvitation.mockResolvedValue(true);

    await expect(
      updateEmployeeEmailAsAdministrator({
        email: "invited@example.com",
        employeeId,
      }),
    ).resolves.toEqual({ changed: true, invitationSent: true });

    expect(mocks.safelySendPlatformInvitation).toHaveBeenCalledWith({
      email: "invited@example.com",
      platformUserId: targetId,
    });
  });

  it("updates a deferred account without sending an invitation", async () => {
    mocks.findPlatformUserById.mockResolvedValue({
      ...activeTarget(),
      authUserId: null,
      invitation: {
        invitationId: null,
        lastSentAt: null,
      },
      status: "invited",
    });

    await expect(
      updateEmployeeEmailAsAdministrator({
        email: "pending@example.com",
        employeeId,
      }),
    ).resolves.toEqual({ changed: true, invitationSent: true });

    expect(mocks.revokeInvitation).not.toHaveBeenCalled();
    expect(mocks.safelySendPlatformInvitation).not.toHaveBeenCalled();
    expect(mocks.recordAuthAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ invitationDeferred: true }),
      }),
    );
  });
});
