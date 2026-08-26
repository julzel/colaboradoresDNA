import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

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
  setPlatformUserClerkSyncStatus,
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
      actorClerkUserId: actor.clerkUserId,
      actorPlatformUserId: actor.platformUser.id,
      metadata: { role: target.role },
      targetPlatformUserId: target.id,
    });
  } catch {
    if (target) {
      await markPlatformUserInvitationFailed(target.id);
      await recordAuthAudit({
        action: "invitation_failed",
        actorClerkUserId: actor.clerkUserId,
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

  if (target.invitation.clerkInvitationId) {
    try {
      const client = await clerkClient();
      await client.invitations.revokeInvitation(target.invitation.clerkInvitationId);
    } catch {
      // Expired, accepted, or already revoked invitations cannot be reused.
    }
  }

  try {
    await sendPlatformInvitation({
      email: target.normalizedEmail,
      platformUserId: target.id,
    });
    await recordAuthAudit({
      action: "invitation_resent",
      actorClerkUserId: actor.clerkUserId,
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

  let clerkSyncFailed = false;

  if (target.clerkUserId) {
    try {
      const client = await clerkClient();
      await client.users.banUser(target.clerkUserId);
      await setPlatformUserClerkSyncStatus({ id: target.id, status: "synced" });
    } catch {
      clerkSyncFailed = true;
      await recordAuthAudit({
        action: "session_revocation_failed",
        actorClerkUserId: actor.clerkUserId,
        actorPlatformUserId: actor.platformUser.id,
        metadata: { operation: "deactivate" },
        targetPlatformUserId: target.id,
      });
    }
  } else {
    await setPlatformUserClerkSyncStatus({ id: target.id, status: "synced" });
  }

  await recordAuthAudit({
    action: "account_deactivated",
    actorClerkUserId: actor.clerkUserId,
    actorPlatformUserId: actor.platformUser.id,
    metadata: { clerkSyncFailed },
    targetPlatformUserId: target.id,
  });

  return { clerkSyncFailed };
}

export async function reactivateAccountForAdministration(platformUserId: string) {
  const actor = await requirePlatformUser({ roles: ["administrator"] });
  const target = await findPlatformUserById(platformUserId);

  if (!target || target.status !== "deactivated") {
    throw new AccountAdministrationError("reactivation_failed");
  }

  if (target.clerkUserId) {
    try {
      await setPlatformUserClerkSyncStatus({
        id: target.id,
        status: "pending_reactivation",
      });
      const client = await clerkClient();
      await client.users.unbanUser(target.clerkUserId);
    } catch {
      throw new AccountAdministrationError("reactivation_sync_failed");
    }
  }

  const reactivated = await reactivatePlatformUserRecord({
    id: target.id,
    status: target.clerkUserId ? "active" : "invited",
  });
  if (!reactivated) {
    throw new AccountAdministrationError("reactivation_failed");
  }

  await recordAuthAudit({
    action: "account_reactivated",
    actorClerkUserId: actor.clerkUserId,
    actorPlatformUserId: actor.platformUser.id,
    metadata: { status: reactivated.status },
    targetPlatformUserId: target.id,
  });
}
