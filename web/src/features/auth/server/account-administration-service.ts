import "server-only";

import { revokeIdentitySessions } from "@/features/auth/server/auth-provider";

import type { InvitePlatformUserInput } from "@/features/auth/domain/platform-user";
import { recordAuthAudit } from "@/features/auth/server/auth-audit-repository";
import { sendPlatformInvitation } from "@/features/auth/server/invitation-service";
import {
  createInvitedPlatformUser,
  deactivatePlatformUserRecord,
  findPlatformUserByEmail,
  findPlatformUserById,
  markPlatformUserInvitationFailed,
  reactivatePlatformUserRecord,
  setPlatformUserAuthSyncStatus,
} from "@/features/auth/server/platform-user-repository";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";

export type AccountAdministrationErrorCode =
  | "account_exists"
  | "deactivation_failed"
  | "invalid_account"
  | "invalid_deactivation"
  | "invitation_failed"
  | "invitation_not_pending"
  | "reactivation_failed"
  | "reactivation_sync_failed";

export class AccountAdministrationError extends Error {
  constructor(readonly code: AccountAdministrationErrorCode) {
    super(code);
    this.name = "AccountAdministrationError";
  }
}

export async function inviteAccountForAdministration(input: InvitePlatformUserInput) {
  const actor = await requirePlatformUser({ roles: ["administrator"] });
  if (await findPlatformUserByEmail(input.email)) {
    throw new AccountAdministrationError("account_exists");
  }

  let target: Awaited<ReturnType<typeof createInvitedPlatformUser>> | undefined;

  try {
    target = await createInvitedPlatformUser(input);
    await sendPlatformInvitation({
      email: target.normalizedEmail,
      platformUserId: target.id,
    });
    await recordAuthAudit({
      action: "invitation_created",
      actorAuthUserId: actor.authUserId,
      actorPlatformUserId: actor.platformUser.id,
      metadata: { role: target.role },
      targetPlatformUserId: target.id,
    });
  } catch {
    if (target) {
      await markPlatformUserInvitationFailed(target.id);
      await recordAuthAudit({
        action: "invitation_failed",
        actorAuthUserId: actor.authUserId,
        actorPlatformUserId: actor.platformUser.id,
        metadata: { role: target.role },
        targetPlatformUserId: target.id,
      });
    }

    throw new AccountAdministrationError("invitation_failed");
  }
}

export async function resendAccountInvitationForAdministration(platformUserId: string) {
  const actor = await requirePlatformUser({ roles: ["administrator"] });
  const target = await findPlatformUserById(platformUserId);

  if (!target || target.status !== "invited") {
    throw new AccountAdministrationError("invitation_not_pending");
  }

  try {
    await sendPlatformInvitation({
      email: target.normalizedEmail,
      platformUserId: target.id,
    });
    await recordAuthAudit({
      action: "invitation_resent",
      actorAuthUserId: actor.authUserId,
      actorPlatformUserId: actor.platformUser.id,
      targetPlatformUserId: target.id,
    });
  } catch {
    await markPlatformUserInvitationFailed(target.id);
    throw new AccountAdministrationError("invitation_failed");
  }
}

export async function deactivateAccountForAdministration(platformUserId: string) {
  const actor = await requirePlatformUser({ roles: ["administrator"] });
  if (platformUserId === actor.platformUser.id) {
    throw new AccountAdministrationError("invalid_deactivation");
  }

  const existing = await findPlatformUserById(platformUserId);
  if (!existing) throw new AccountAdministrationError("invalid_account");

  const target =
    existing.status === "deactivated"
      ? existing
      : await deactivatePlatformUserRecord(existing.id);
  if (!target) throw new AccountAdministrationError("deactivation_failed");

  let authSyncFailed = false;

  if (target.authUserId) {
    try {
      await revokeIdentitySessions(target.authUserId);
      await setPlatformUserAuthSyncStatus({ id: target.id, status: "synced" });
    } catch {
      authSyncFailed = true;
      await recordAuthAudit({
        action: "session_revocation_failed",
        actorAuthUserId: actor.authUserId,
        actorPlatformUserId: actor.platformUser.id,
        metadata: { operation: "deactivate" },
        targetPlatformUserId: target.id,
      });
    }
  } else {
    await setPlatformUserAuthSyncStatus({ id: target.id, status: "synced" });
  }

  await recordAuthAudit({
    action: "account_deactivated",
    actorAuthUserId: actor.authUserId,
    actorPlatformUserId: actor.platformUser.id,
    metadata: { authSyncFailed },
    targetPlatformUserId: target.id,
  });

  return { authSyncFailed };
}

export async function reactivateAccountForAdministration(platformUserId: string) {
  const actor = await requirePlatformUser({ roles: ["administrator"] });
  const target = await findPlatformUserById(platformUserId);

  if (!target || target.status !== "deactivated") {
    throw new AccountAdministrationError("reactivation_failed");
  }

  if (target.authUserId) {
    try {
      await setPlatformUserAuthSyncStatus({
        id: target.id,
        status: "pending_reactivation",
      });
      await revokeIdentitySessions(target.authUserId);
    } catch {
      throw new AccountAdministrationError("reactivation_sync_failed");
    }
  }

  const reactivated = await reactivatePlatformUserRecord({
    id: target.id,
    status: target.authUserId ? "active" : "invited",
  });
  if (!reactivated) {
    throw new AccountAdministrationError("reactivation_failed");
  }

  await recordAuthAudit({
    action: "account_reactivated",
    actorAuthUserId: actor.authUserId,
    actorPlatformUserId: actor.platformUser.id,
    metadata: { status: reactivated.status },
    targetPlatformUserId: target.id,
  });
}
