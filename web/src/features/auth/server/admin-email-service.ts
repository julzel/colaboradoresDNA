import "server-only";

import { updateManagedIdentityEmail } from "./identity-administration";

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
    Boolean(target.invitation.lastSentAt || target.invitation.invitationId);

  if (target.status === "active") {
    if (!target.authUserId) {
      throw new AdminEmailUpdateError("identity_sync_failed");
    }

    try {
      await updateManagedIdentityEmail(target.authUserId, target.id, normalizedEmail);
    } catch {
      throw new AdminEmailUpdateError("identity_sync_failed");
    }
  } else {
    if (!(await updatePlatformRecord())) {
      throw new AdminEmailUpdateError("account_not_editable");
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
    actorAuthUserId: actor.authUserId,
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
