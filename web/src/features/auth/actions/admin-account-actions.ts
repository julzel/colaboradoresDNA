"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  invitePlatformUserSchema,
  platformUserIdSchema,
} from "@/features/auth/domain/platform-user";
import {
  AccountAdministrationError,
  deactivateAccountForAdministration,
  inviteAccountForAdministration,
  reactivateAccountForAdministration,
  resendAccountInvitationForAdministration,
} from "@/features/auth/server/account-administration-service";
import {
  createFeedbackUrl,
  type FeedbackMessageKey,
} from "@/lib/actions/feedback-messages";

const accountsPath = "/admin/accounts";

function redirectWithError(error: unknown, fallback: FeedbackMessageKey): never {
  const key: FeedbackMessageKey =
    error instanceof AccountAdministrationError ? error.code : fallback;
  redirect(createFeedbackUrl(accountsPath, "error", key));
}

export async function invitePlatformUser(formData: FormData) {
  const parsed = invitePlatformUserSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) redirectWithError(null, "invalid_invitation");

  try {
    await inviteAccountForAdministration(parsed.data);
  } catch (error) {
    redirectWithError(error, "invitation_failed");
  }

  revalidatePath(accountsPath);
  redirect(createFeedbackUrl(accountsPath, "notice", "invitation_sent"));
}

export async function resendPlatformInvitation(formData: FormData) {
  const parsed = platformUserIdSchema.safeParse(formData.get("platformUserId"));
  if (!parsed.success) redirectWithError(null, "invalid_account");

  try {
    await resendAccountInvitationForAdministration(parsed.data);
  } catch (error) {
    redirectWithError(error, "invitation_failed");
  }

  revalidatePath(accountsPath);
  redirect(createFeedbackUrl(accountsPath, "notice", "invitation_resent"));
}

export async function deactivatePlatformUser(formData: FormData) {
  const parsed = platformUserIdSchema.safeParse(formData.get("platformUserId"));
  if (!parsed.success) redirectWithError(null, "invalid_deactivation");

  let result;
  try {
    result = await deactivateAccountForAdministration(parsed.data);
  } catch (error) {
    redirectWithError(error, "deactivation_failed");
  }

  revalidatePath(accountsPath);
  redirect(
    result.clerkSyncFailed
      ? createFeedbackUrl(accountsPath, "error", "deactivated_sync_pending")
      : createFeedbackUrl(accountsPath, "notice", "account_deactivated"),
  );
}

export async function reactivatePlatformUser(formData: FormData) {
  const parsed = platformUserIdSchema.safeParse(formData.get("platformUserId"));
  if (!parsed.success) redirectWithError(null, "invalid_account");

  try {
    await reactivateAccountForAdministration(parsed.data);
  } catch (error) {
    redirectWithError(error, "reactivation_failed");
  }

  revalidatePath(accountsPath);
  redirect(createFeedbackUrl(accountsPath, "notice", "account_reactivated"));
}
