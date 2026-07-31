import "server-only";

import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import type { PlatformRole, PlatformUser } from "@/features/auth/domain/platform-user";
import { getAccessDecision } from "@/features/auth/lib/access-policy";
import {
  claimInvitedPlatformUser,
  findPlatformUserByClerkId,
} from "@/features/auth/server/platform-user-repository";

export type AuthenticatedPlatformUser = {
  clerkHasImage: boolean;
  clerkImageUrl: string;
  clerkTwoFactorEnabled: boolean;
  clerkUserId: string;
  platformUser: PlatformUser;
  sessionId: string;
};

function getVerifiedEmails(
  clerkUser: NonNullable<Awaited<ReturnType<typeof currentUser>>>,
) {
  return clerkUser.emailAddresses
    .filter((email) => email.verification?.status === "verified")
    .map((email) => email.emailAddress);
}

async function revokeCurrentSession(sessionId: string) {
  try {
    const client = await clerkClient();
    await client.sessions.revokeSession(sessionId);
  } catch {
    // MongoDB still denies access. A later administrator action can retry Clerk sync.
  }
}

export async function requirePlatformUser({
  allowMfaSetup = false,
  roles,
}: {
  allowMfaSetup?: boolean;
  roles?: readonly PlatformRole[];
} = {}): Promise<AuthenticatedPlatformUser> {
  const authState = await auth();

  if (!authState.isAuthenticated || !authState.userId || !authState.sessionId) {
    return authState.redirectToSignIn();
  }

  const clerkUser = await currentUser();

  if (!clerkUser) {
    return authState.redirectToSignIn();
  }

  let platformUser = await findPlatformUserByClerkId(authState.userId);

  if (!platformUser) {
    platformUser = await claimInvitedPlatformUser({
      clerkUserId: authState.userId,
      verifiedEmails: getVerifiedEmails(clerkUser),
    });
  }

  const decision = getAccessDecision(platformUser, clerkUser.twoFactorEnabled);

  if (!decision.granted) {
    if (decision.reason === "deactivated") {
      await revokeCurrentSession(authState.sessionId);
      redirect("/access-denied?reason=deactivated");
    }

    if (decision.reason === "mfa_required" && allowMfaSetup && platformUser) {
      return {
        clerkHasImage: clerkUser.hasImage,
        clerkImageUrl: clerkUser.imageUrl,
        clerkTwoFactorEnabled: clerkUser.twoFactorEnabled,
        clerkUserId: authState.userId,
        platformUser,
        sessionId: authState.sessionId,
      };
    }

    if (decision.reason === "mfa_required") {
      redirect("/account?requirement=mfa");
    }

    redirect(`/access-denied?reason=${decision.reason}`);
  }

  if (!platformUser) {
    redirect("/access-denied?reason=not_invited");
  }

  if (roles && !roles.includes(platformUser.role)) {
    redirect("/access-denied?reason=forbidden");
  }

  return {
    clerkHasImage: clerkUser.hasImage,
    clerkImageUrl: clerkUser.imageUrl,
    clerkTwoFactorEnabled: clerkUser.twoFactorEnabled,
    clerkUserId: authState.userId,
    platformUser,
    sessionId: authState.sessionId,
  };
}
