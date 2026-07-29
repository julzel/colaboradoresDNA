"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  invitePlatformUserSchema,
  platformUserIdSchema,
} from "@/features/auth/domain/platform-user";
import { recordAuthAudit } from "@/features/auth/server/auth-audit-repository";
import {
  createInvitedPlatformUser,
  deactivatePlatformUserRecord,
  findPlatformUserByEmail,
  findPlatformUserById,
  markPlatformUserInvitationFailed,
  reactivatePlatformUserRecord,
  setPlatformUserClerkSyncStatus,
  setPlatformUserInvitation,
} from "@/features/auth/server/platform-user-repository";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";

const invitationExpirationDays = 14;

function getApplicationBaseUrl() {
  const configuredUrl = process.env.APP_BASE_URL;

  if (configuredUrl) {
    return z.string().url().parse(configuredUrl);
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  throw new Error("APP_BASE_URL is required in production.");
}

async function sendInvitation({
  email,
  platformUserId,
}: {
  email: string;
  platformUserId: string;
}) {
  const client = await clerkClient();
  const invitation = await client.invitations.createInvitation({
    emailAddress: email,
    expiresInDays: invitationExpirationDays,
    ignoreExisting: true,
    redirectUrl: new URL("/sign-up", getApplicationBaseUrl()).toString(),
  });

  const expiresAt = new Date(
    Date.now() + invitationExpirationDays * 24 * 60 * 60 * 1000,
  );

  await setPlatformUserInvitation({
    clerkInvitationId: invitation.id,
    expiresAt,
    id: platformUserId,
  });

  return invitation;
}

export async function invitePlatformUser(formData: FormData) {
  const actor = await requirePlatformUser({ roles: ["administrator"] });
  const parsed = invitePlatformUserSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    redirect("/admin/accounts?error=invalid_invitation");
  }

  const existing = await findPlatformUserByEmail(parsed.data.email);

  if (existing) {
    redirect("/admin/accounts?error=account_exists");
  }

  let target;

  try {
    target = await createInvitedPlatformUser(parsed.data);
    await sendInvitation({
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

    redirect("/admin/accounts?error=invitation_failed");
  }

  revalidatePath("/admin/accounts");
  redirect("/admin/accounts?notice=invitation_sent");
}

export async function resendPlatformInvitation(formData: FormData) {
  const actor = await requirePlatformUser({ roles: ["administrator"] });
  const parsedId = platformUserIdSchema.safeParse(formData.get("platformUserId"));

  if (!parsedId.success) {
    redirect("/admin/accounts?error=invalid_account");
  }

  const target = await findPlatformUserById(parsedId.data);

  if (!target || target.status !== "invited") {
    redirect("/admin/accounts?error=invitation_not_pending");
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
    await sendInvitation({
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
    redirect("/admin/accounts?error=invitation_failed");
  }

  revalidatePath("/admin/accounts");
  redirect("/admin/accounts?notice=invitation_resent");
}

export async function deactivatePlatformUser(formData: FormData) {
  const actor = await requirePlatformUser({ roles: ["administrator"] });
  const parsedId = platformUserIdSchema.safeParse(formData.get("platformUserId"));

  if (!parsedId.success || parsedId.data === actor.platformUser.id) {
    redirect("/admin/accounts?error=invalid_deactivation");
  }

  const existing = await findPlatformUserById(parsedId.data);

  if (!existing) {
    redirect("/admin/accounts?error=invalid_account");
  }

  const target =
    existing.status === "deactivated"
      ? existing
      : await deactivatePlatformUserRecord(existing.id);

  if (!target) {
    redirect("/admin/accounts?error=deactivation_failed");
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
      ? "/admin/accounts?error=deactivated_sync_pending"
      : "/admin/accounts?notice=account_deactivated",
  );
}

export async function reactivatePlatformUser(formData: FormData) {
  const actor = await requirePlatformUser({ roles: ["administrator"] });
  const parsedId = platformUserIdSchema.safeParse(formData.get("platformUserId"));

  if (!parsedId.success) {
    redirect("/admin/accounts?error=invalid_account");
  }

  const target = await findPlatformUserById(parsedId.data);

  if (!target || target.status !== "deactivated") {
    redirect("/admin/accounts?error=reactivation_failed");
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
      redirect("/admin/accounts?error=reactivation_sync_failed");
    }
  }

  const reactivated = await reactivatePlatformUserRecord({
    id: target.id,
    status: target.clerkUserId ? "active" : "invited",
  });

  if (!reactivated) {
    redirect("/admin/accounts?error=reactivation_failed");
  }

  await recordAuthAudit({
    action: "account_reactivated",
    actorClerkUserId: actor.clerkUserId,
    actorPlatformUserId: actor.platformUser.id,
    metadata: { status: reactivated.status },
    targetPlatformUserId: target.id,
  });

  revalidatePath("/admin/accounts");
  redirect("/admin/accounts?notice=account_reactivated");
}
