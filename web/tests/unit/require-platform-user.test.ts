import { beforeEach, describe, expect, it, vi } from "vitest";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";
const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  revoke: vi.fn(),
  find: vi.fn(),
  claim: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/features/auth/server/auth-provider", () => ({
  getIdentitySession: mocks.session,
  revokeIdentitySessions: mocks.revoke,
}));
vi.mock("@/features/auth/server/platform-user-repository", () => ({
  findPlatformUserByAuthId: mocks.find,
  claimInvitedPlatformUser: mocks.claim,
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error("redirect:" + url);
  },
}));
const user = {
  id: "identity",
  email: "julio@example.com",
  emailVerified: true,
  image: "/api/profile-images/identity",
  twoFactorEnabled: false,
};
const platform = {
  id: "platform",
  normalizedEmail: user.email,
  role: "collaborator",
  status: "active",
};
describe("managed platform authorization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.session.mockResolvedValue({
      user,
      session: { id: "session", mfaVerified: false },
    });
    mocks.find.mockResolvedValue(platform);
    mocks.revoke.mockResolvedValue(undefined);
  });
  it("returns provider-neutral identity and platform permissions", async () => {
    await expect(requirePlatformUser()).resolves.toMatchObject({
      authUserId: user.id,
      platformUser: platform,
      hasImage: true,
    });
  });
  it("redirects unauthenticated visitors", async () => {
    mocks.session.mockResolvedValue(null);
    await expect(requirePlatformUser()).rejects.toThrow("redirect:/sign-in");
  });
  it("requires email verification before claiming an account", async () => {
    mocks.session.mockResolvedValue({
      user: { ...user, emailVerified: false },
      session: {},
    });
    await expect(requirePlatformUser()).rejects.toThrow("verification=required");
    expect(mocks.claim).not.toHaveBeenCalled();
  });
  it("rejects mismatched identity emails", async () => {
    mocks.find.mockResolvedValue({ ...platform, normalizedEmail: "other@example.com" });
    await expect(requirePlatformUser()).rejects.toThrow("email_mismatch");
  });
  it("revokes sessions for disabled accounts", async () => {
    mocks.find.mockResolvedValue({ ...platform, status: "deactivated" });
    await expect(requirePlatformUser()).rejects.toThrow("deactivated");
    expect(mocks.revoke).toHaveBeenCalledWith(user.id);
  });
  it("does not treat enrollment as proof of an MFA-verified session", async () => {
    mocks.find.mockResolvedValue({ ...platform, role: "administrator" });
    mocks.session.mockResolvedValue({
      user: { ...user, twoFactorEnabled: true },
      session: { id: "s", mfaVerified: false },
    });
    await expect(requirePlatformUser()).rejects.toThrow("requirement=mfa");
    await expect(requirePlatformUser({ allowMfaSetup: true })).resolves.toBeDefined();
  });
  it("admits an administrator after MFA and rejects unauthorized roles", async () => {
    mocks.find.mockResolvedValue({ ...platform, role: "administrator" });
    mocks.session.mockResolvedValue({
      user: { ...user, twoFactorEnabled: true },
      session: { id: "s", mfaVerified: true },
    });
    await expect(
      requirePlatformUser({ roles: ["administrator"] }),
    ).resolves.toBeDefined();
    mocks.find.mockResolvedValue(platform);
    await expect(requirePlatformUser({ roles: ["administrator"] })).rejects.toThrow(
      "forbidden",
    );
  });
});
