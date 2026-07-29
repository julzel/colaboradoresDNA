import { describe, expect, it } from "vitest";

import type { PlatformUser } from "@/features/auth/domain/platform-user";
import { normalizeEmail, requiresMfa } from "@/features/auth/domain/platform-user";
import { getAccessDecision } from "@/features/auth/lib/access-policy";

function createPlatformUser(overrides: Partial<PlatformUser> = {}): PlatformUser {
  const now = new Date("2026-07-28T12:00:00.000Z");

  return {
    activatedAt: now,
    clerkSyncStatus: "synced",
    clerkUserId: "user_test",
    createdAt: now,
    deactivatedAt: null,
    displayName: "Ana Mora",
    id: "507f1f77bcf86cd799439011",
    invitation: {
      clerkInvitationId: "inv_test",
      expiresAt: now,
      lastSentAt: now,
      status: "accepted",
    },
    normalizedEmail: "ana@example.com",
    role: "collaborator",
    status: "active",
    updatedAt: now,
    ...overrides,
  };
}

describe("authentication access policy", () => {
  it("denies identities without a platform invitation", () => {
    expect(getAccessDecision(null, true)).toEqual({
      granted: false,
      reason: "not_invited",
    });
  });

  it("denies pending and deactivated platform users", () => {
    expect(getAccessDecision(createPlatformUser({ status: "invited" }), true)).toEqual({
      granted: false,
      reason: "invitation_pending",
    });
    expect(
      getAccessDecision(createPlatformUser({ status: "deactivated" }), true),
    ).toEqual({
      granted: false,
      reason: "deactivated",
    });
  });

  it.each(["administrator", "supervisor"] as const)(
    "requires MFA for the %s role",
    (role) => {
      expect(getAccessDecision(createPlatformUser({ role }), false)).toEqual({
        granted: false,
        reason: "mfa_required",
      });
      expect(getAccessDecision(createPlatformUser({ role }), true)).toEqual({
        granted: true,
      });
    },
  );

  it("allows active collaborators without forcing MFA", () => {
    expect(getAccessDecision(createPlatformUser(), false)).toEqual({
      granted: true,
    });
  });
});

describe("platform identity helpers", () => {
  it("normalizes email addresses deterministically", () => {
    expect(normalizeEmail("  Ana.Mora@Example.COM ")).toBe("ana.mora@example.com");
  });

  it("identifies privileged roles that require MFA", () => {
    expect(requiresMfa("administrator")).toBe(true);
    expect(requiresMfa("supervisor")).toBe(true);
    expect(requiresMfa("collaborator")).toBe(false);
  });
});
