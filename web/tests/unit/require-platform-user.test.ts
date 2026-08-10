import { beforeEach, describe, expect, it, vi } from "vitest";

import { requirePlatformUser } from "@/features/auth/server/require-platform-user";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  claimInvitedPlatformUser: vi.fn(),
  clerkClient: vi.fn(),
  currentUser: vi.fn(),
  findPlatformUserByClerkId: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
  updateUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
  clerkClient: mocks.clerkClient,
  currentUser: mocks.currentUser,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/features/auth/server/platform-user-repository", () => ({
  claimInvitedPlatformUser: mocks.claimInvitedPlatformUser,
  findPlatformUserByClerkId: mocks.findPlatformUserByClerkId,
}));

function platformUser() {
  return {
    clerkUserId: "user_123",
    id: "507f1f77bcf86cd799439011",
    normalizedEmail: "julio@example.com",
    role: "collaborator",
    status: "active",
  };
}

function clerkUser({
  deleteSelfEnabled = false,
  email = "julio@example.com",
}: {
  deleteSelfEnabled?: boolean;
  email?: string;
} = {}) {
  return {
    deleteSelfEnabled,
    emailAddresses: [
      {
        emailAddress: email,
        id: "idn_primary",
        verification: { status: "verified" },
      },
    ],
    hasImage: true,
    id: "user_123",
    imageUrl: "https://img.example.com/profile.webp",
    primaryEmailAddressId: "idn_primary",
    twoFactorEnabled: false,
  };
}

describe("managed platform authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      isAuthenticated: true,
      redirectToSignIn: vi.fn(),
      sessionId: "sess_123",
      userId: "user_123",
    });
    mocks.currentUser.mockResolvedValue(clerkUser());
    mocks.findPlatformUserByClerkId.mockResolvedValue(platformUser());
    mocks.clerkClient.mockResolvedValue({
      sessions: { revokeSession: vi.fn() },
      users: { updateUser: mocks.updateUser },
    });
  });

  it("returns one canonical Clerk image and platform identity", async () => {
    await expect(requirePlatformUser()).resolves.toMatchObject({
      clerkHasImage: true,
      clerkImageUrl: "https://img.example.com/profile.webp",
      clerkUserId: "user_123",
      platformUser: { normalizedEmail: "julio@example.com" },
    });
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("fails closed when a user changes the provider primary email", async () => {
    mocks.currentUser.mockResolvedValue(clerkUser({ email: "other@example.com" }));

    await expect(requirePlatformUser()).rejects.toThrow(
      "redirect:/access-denied?reason=email_mismatch",
    );
    expect(mocks.redirect).toHaveBeenCalledWith("/access-denied?reason=email_mismatch");
  });

  it("disables self-deletion before granting workspace access", async () => {
    mocks.currentUser.mockResolvedValue(clerkUser({ deleteSelfEnabled: true }));

    await expect(requirePlatformUser()).resolves.toBeDefined();
    expect(mocks.updateUser).toHaveBeenCalledWith("user_123", {
      deleteSelfEnabled: false,
    });
  });

  it("fails closed when the managed-account policy cannot be applied", async () => {
    mocks.currentUser.mockResolvedValue(clerkUser({ deleteSelfEnabled: true }));
    mocks.updateUser.mockRejectedValue(new Error("provider unavailable"));

    await expect(requirePlatformUser()).rejects.toThrow(
      "redirect:/access-denied?reason=account_policy",
    );
    expect(mocks.findPlatformUserByClerkId).not.toHaveBeenCalled();
  });
});
