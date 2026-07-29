import { requiresMfa, type PlatformUser } from "@/features/auth/domain/platform-user";

export type AccessDecision =
  | { granted: true }
  | {
      granted: false;
      reason: "deactivated" | "invitation_pending" | "mfa_required" | "not_invited";
    };

export function getAccessDecision(
  user: PlatformUser | null,
  clerkTwoFactorEnabled: boolean,
): AccessDecision {
  if (!user) {
    return { granted: false, reason: "not_invited" };
  }

  if (user.status === "deactivated") {
    return { granted: false, reason: "deactivated" };
  }

  if (user.status !== "active") {
    return { granted: false, reason: "invitation_pending" };
  }

  if (requiresMfa(user.role) && !clerkTwoFactorEnabled) {
    return { granted: false, reason: "mfa_required" };
  }

  return { granted: true };
}
