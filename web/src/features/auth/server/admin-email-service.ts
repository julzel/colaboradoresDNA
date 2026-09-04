import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import { normalizeEmail } from "@/features/auth/domain/platform-user";
import { recordAuthAudit } from "@/features/auth/server/auth-audit-repository";
import {
  findPlatformUserByEmail,
  findPlatformUserById,
  updatePlatformUserEmail,
} from "@/features/auth/server/platform-user-repository";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";
import { safelySendPlatformInvitation } from "@/features/auth/server/invitation-service";
import { findEmployeeById } from "@/features/employees/server/employee-repository";

export type AdminEmailUpdateErrorCode =
  | "account_not_editable"
  | "email_exists"
  | "employee_not_found"
  | "identity_sync_failed";

export class AdminEmailUpdateError extends Error {
  constructor(readonly code: AdminEmailUpdateErrorCode) {
    super(code);
    this.name = "AdminEmailUpdateError";
  }
}

async function updateActiveClerkEmail({
  clerkUserId,
  email,
  updatePlatformRecord,
}: {
  clerkUserId: string;
  email: string;
  updatePlatformRecord: () => Promise<boolean>;
}) {
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(clerkUserId);
  const normalizedEmail = normalizeEmail(email);
  const previousPrimaryId = clerkUser.primaryEmailAddressId;
  const existingAddress = clerkUser.emailAddresses.find(
    (address) => normalizeEmail(address.emailAddress) === normalizedEmail,
  );
  let createdAddressId: string | null = null;

  try {
    const address = existingAddress
      ? await client.emailAddresses.updateEmailAddress(existingAddress.id, {
          verified: true,
        })
      : await client.emailAddresses.createEmailAddress({
          emailAddress: normalizedEmail,
          userId: clerkUserId,
          verified: true,
        });

    if (!existingAddress) createdAddressId = address.id;

    await client.users.updateUser(clerkUserId, {
      notifyPrimaryEmailAddressChanged: true,
      primaryEmailAddressID: address.id,
    });

    if (!(await updatePlatformRecord())) {
      throw new AdminEmailUpdateError("account_not_editable");
    }
  } catch (error) {
    if (previousPrimaryId) {
      try {
        await client.users.updateUser(clerkUserId, {
          primaryEmailAddressID: previousPrimaryId,
        });
      } catch {
        // The application record remains unchanged, so authorization stays fail-closed.
      }
    }

    if (createdAddressId) {
      try {
        await client.emailAddresses.deleteEmailAddress(createdAddressId);
      } catch {
        // A non-primary orphaned address is safer than committing inconsistent app data.
      }
    }

    if (error instanceof AdminEmailUpdateError) throw error;
    throw new AdminEmailUpdateError("identity_sync_failed");
  }
}

export async function updateEmployeeEmailAsAdministrator({
  email,
  employeeId,
}: {
  email: string;
  employeeId: string;
}) {
  const actor = await requirePlatformUser({ roles: ["administrator"] });
  const employee = await findEmployeeById(employeeId);
  if (!employee) throw new AdminEmailUpdateError("employee_not_found");

  const target = await findPlatformUserById(employee.platformUserId);
  if (!target || target.status === "deactivated") {
    throw new AdminEmailUpdateError("account_not_editable");
  }

  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail === target.normalizedEmail) {
    return { changed: false, invitationSent: true };
  }

  const existing = await findPlatformUserByEmail(normalizedEmail);
  if (existing && existing.id !== target.id) {
    throw new AdminEmailUpdateError("email_exists");
  }

  const updatePlatformRecord = async () =>
    Boolean(await updatePlatformUserEmail({ email: normalizedEmail, id: target.id }));

  let invitationSent = true;
  const invitationWasSent =
    target.status === "invited" &&
    Boolean(target.invitation.lastSentAt || target.invitation.clerkInvitationId);

  if (target.status === "active") {
    if (!target.clerkUserId) {
      throw new AdminEmailUpdateError("identity_sync_failed");
    }

    await updateActiveClerkEmail({
      clerkUserId: target.clerkUserId,
      email: normalizedEmail,
      updatePlatformRecord,
    });
  } else {
    if (!(await updatePlatformRecord())) {
      throw new AdminEmailUpdateError("account_not_editable");
    }

    if (target.invitation.clerkInvitationId) {
      try {
        const client = await clerkClient();
        await client.invitations.revokeInvitation(target.invitation.clerkInvitationId);
      } catch {
        // Expired invitations cannot claim the record after its email changes.
      }
    }

    if (invitationWasSent) {
      invitationSent = await safelySendPlatformInvitation({
        email: normalizedEmail,
        platformUserId: target.id,
      });
    }
  }

  await recordAuthAudit({
    action: "email_updated",
    actorClerkUserId: actor.clerkUserId,
    actorPlatformUserId: actor.platformUser.id,
    metadata: {
      invitationDeferred: target.status === "invited" && !invitationWasSent,
      invitationSent,
      status: target.status,
    },
    targetPlatformUserId: target.id,
  });

  return { changed: true, invitationSent };
}
