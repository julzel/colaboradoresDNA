"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  invitePlatformUserSchema,
  platformUserIdSchema,
} from "@/features/auth/domain/platform-user";
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
import { createFeedbackUrl } from "@/lib/actions/feedback-messages";

export async function invitePlatformUser(formData: FormData) {
  const actor = await requirePlatformUser({ roles: ["administrator"] });
  const parsed = invitePlatformUserSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    redirect(createFeedbackUrl("/admin/accounts", "error", "invalid_invitation"));
  }

  const existing = await findPlatformUserByEmail(parsed.data.email);

  if (existing) {
    redirect(createFeedbackUrl("/admin/accounts", "error", "account_exists"));
  }

  let target;

  try {
    target = await createInvitedPlatformUser(parsed.data);
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

    redirect(createFeedbackUrl("/admin/accounts", "error", "invitation_failed"));
  }

  revalidatePath("/admin/accounts");
  redirect(createFeedbackUrl("/admin/accounts", "notice", "invitation_sent"));
}

export async function resendPlatformInvitation(formData: FormData) {
  const actor = await requirePlatformUser({ roles: ["administrator"] });
  const parsedId = platformUserIdSchema.safeParse(formData.get("platformUserId"));

  if (!parsedId.success) {
    redirect(createFeedbackUrl("/admin/accounts", "error", "invalid_account"));
  }

  const target = await findPlatformUserById(parsedId.data);

  if (!target || target.status !== "invited") {
    redirect(createFeedbackUrl("/admin/accounts", "error", "invitation_not_pending"));
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
    redirect(createFeedbackUrl("/admin/accounts", "error", "invitation_failed"));
  }

  revalidatePath("/admin/accounts");
  redirect(createFeedbackUrl("/admin/accounts", "notice", "invitation_resent"));
}

export async function deactivatePlatformUser(formData: FormData) {
  const actor = await requirePlatformUser({ roles: ["administrator"] });
  const parsedId = platformUserIdSchema.safeParse(formData.get("platformUserId"));

  if (!parsedId.success || parsedId.data === actor.platformUser.id) {
    redirect(createFeedbackUrl("/admin/accounts", "error", "invalid_deactivation"));
  }

  const existing = await findPlatformUserById(parsedId.data);

  if (!existing) {
    redirect(createFeedbackUrl("/admin/accounts", "error", "invalid_account"));
  }

  const target =
    existing.status === "deactivated"
      ? existing
      : await deactivatePlatformUserRecord(existing.id);

  if (!target) {
    redirect(createFeedbackUrl("/admin/accounts", "error", "deactivation_failed"));
  }

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

  revalidatePath("/admin/accounts");
  redirect(
    clerkSyncFailed
      ? createFeedbackUrl("/admin/accounts", "error", "deactivated_sync_pending")
      : createFeedbackUrl("/admin/accounts", "notice", "account_deactivated"),
  );
}

export async function reactivatePlatformUser(formData: FormData) {
  const actor = await requirePlatformUser({ roles: ["administrator"] });
  const parsedId = platformUserIdSchema.safeParse(formData.get("platformUserId"));

  if (!parsedId.success) {
    redirect(createFeedbackUrl("/admin/accounts", "error", "invalid_account"));
  }

  const target = await findPlatformUserById(parsedId.data);

  if (!target || target.status !== "deactivated") {
    redirect(createFeedbackUrl("/admin/accounts", "error", "reactivation_failed"));
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
      redirect(
        createFeedbackUrl("/admin/accounts", "error", "reactivation_sync_failed"),
      );
    }
  }

  const reactivated = await reactivatePlatformUserRecord({
    id: target.id,
    status: target.clerkUserId ? "active" : "invited",
  });

  if (!reactivated) {
    redirect(createFeedbackUrl("/admin/accounts", "error", "reactivation_failed"));
  }

  await recordAuthAudit({
    action: "account_reactivated",
    actorClerkUserId: actor.clerkUserId,
    actorPlatformUserId: actor.platformUser.id,
    metadata: { status: reactivated.status },
    targetPlatformUserId: target.id,
  });

  revalidatePath("/admin/accounts");
  redirect(createFeedbackUrl("/admin/accounts", "notice", "account_reactivated"));
}
