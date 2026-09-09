import "server-only";
import { redirect } from "next/navigation";
import type { PlatformRole, PlatformUser } from "../domain/platform-user";
import { normalizeEmail } from "../domain/platform-user";
import { getAccessDecision } from "../lib/access-policy";
import {
  claimInvitedPlatformUser,
  findPlatformUserByAuthId,
} from "./platform-user-repository";
import { getIdentitySession, revokeIdentitySessions } from "./auth-provider";

export type AuthenticatedPlatformUser = {
  hasImage: boolean;
  imageUrl: string;
  twoFactorEnabled: boolean;
  authUserId: string;
  platformUser: PlatformUser;
  sessionId: string;
};

export async function requirePlatformUser({
  allowMfaSetup = false,
  roles,
}: {
  allowMfaSetup?: boolean;
  roles?: readonly PlatformRole[];
} = {}): Promise<AuthenticatedPlatformUser> {
  const identity = await getIdentitySession();
  if (!identity) redirect("/sign-in");
  const { user, session } = identity;
  if (!user.emailVerified) redirect("/sign-in?verification=required");
  let platformUser = await findPlatformUserByAuthId(user.id);
  platformUser ??= await claimInvitedPlatformUser({
    authUserId: user.id,
    verifiedEmails: [user.email],
  });
  if (!platformUser) redirect("/access-denied?reason=not_invited");
  if (normalizeEmail(user.email) !== platformUser.normalizedEmail)
    redirect("/access-denied?reason=email_mismatch");
  const decision = getAccessDecision(
    platformUser,
    Boolean(user.twoFactorEnabled && session.mfaVerified),
  );
  if (!decision.granted) {
    if (decision.reason === "deactivated") {
      await revokeIdentitySessions(user.id).catch(() => undefined);
      redirect("/access-denied?reason=deactivated");
    }
    if (decision.reason === "mfa_required") {
      if (!allowMfaSetup) redirect("/account?requirement=mfa");
    } else redirect(`/access-denied?reason=${decision.reason}`);
  }
  if (roles && !roles.includes(platformUser.role))
    redirect("/access-denied?reason=forbidden");
  return {
    hasImage: Boolean(user.image),
    imageUrl: user.image ?? "",
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
    authUserId: user.id,
    platformUser,
    sessionId: session.id,
  };
}
