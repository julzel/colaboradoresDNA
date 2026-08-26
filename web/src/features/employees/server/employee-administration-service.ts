import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import { recordAuthAudit } from "@/features/auth/server/auth-audit-repository";
import {
  safelySendPlatformInvitation,
  sendPlatformInvitation,
} from "@/features/auth/server/invitation-service";
import {
  findPlatformUserById,
  markPlatformUserInvitationFailed,
  setPlatformUserClerkSyncStatus,
  updatePlatformUserRole,
} from "@/features/auth/server/platform-user-repository";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";
import type { PlatformRole } from "@/features/auth/domain/platform-user";
import type { NormalizedEmployeePersonalInformationInput } from "@/features/employees/domain/employee";
import { EmployeeDomainError } from "@/features/employees/domain/errors";
import type { CreateEmployeeWithAccessInput } from "@/features/employees/server/employee-service";
import { createEmployeeWithAccess } from "@/features/employees/server/employee-service";
import {
  endEmployeeEmployment,
  findEmployeeById,
  updateEmployeePersonalInformation,
} from "@/features/employees/server/employee-repository";
import { revealEmployeeIdentificationValue } from "@/features/employees/server/employee-read-repository";

export type EmployeeAdministrationErrorCode =
  | "invitation_failed"
  | "invitation_not_pending"
  | "own_employment_end"
  | "role_update_failed";

export class EmployeeAdministrationError extends Error {
  constructor(readonly code: EmployeeAdministrationErrorCode) {
    super(code);
    this.name = "EmployeeAdministrationError";
  }
}

export async function createEmployeeForAdministration(
  input: CreateEmployeeWithAccessInput,
) {
  const result = await createEmployeeWithAccess(input);
  const invitationSent = await safelySendPlatformInvitation({
    email: result.platformUser.normalizedEmail,
    platformUserId: result.platformUser.id,
  });

  await recordAuthAudit({
    action: invitationSent ? "invitation_created" : "invitation_failed",
    actorClerkUserId: result.actor.clerkUserId ?? "system",
    actorPlatformUserId: result.actor.id,
    metadata: { role: result.platformUser.role },
    targetPlatformUserId: result.platformUser.id,
  });

  return { employeeId: result.employee.id, invitationSent };
}

export async function updateEmployeePersonalInformationForAdministration({
  employeeId,
  input,
}: {
  employeeId: string;
  input: NormalizedEmployeePersonalInformationInput;
}) {
  const { platformUser } = await requirePlatformUser({
    roles: ["administrator"],
  });
  const existing = await findEmployeeById(employeeId);
  if (!existing) throw new EmployeeDomainError("employee_not_found");

  return updateEmployeePersonalInformation({
    actorPlatformUserId: platformUser.id,
    employeeId,
    input: {
      ...input,
      employmentEndedOn: existing.employmentEndedOn,
      employmentStartedOn: existing.employmentStartedOn,
      employmentStatus: existing.employmentStatus,
      phoneNumber: input.phoneNumber?.displayValue ?? null,
      platformUserId: existing.platformUserId,
    },
  });
}

export async function updateEmployeeRoleForAdministration({
  employeeId,
  role,
}: {
  employeeId: string;
  role: PlatformRole;
}) {
  const actor = await requirePlatformUser({ roles: ["administrator"] });
  const employee = await findEmployeeById(employeeId);
  if (!employee) throw new EmployeeDomainError("employee_not_found");

  const updated = await updatePlatformUserRole({
    id: employee.platformUserId,
    role,
  });
  if (!updated) throw new EmployeeAdministrationError("role_update_failed");

  await recordAuthAudit({
    action: "role_updated",
    actorClerkUserId: actor.clerkUserId,
    actorPlatformUserId: actor.platformUser.id,
    metadata: { role: updated.role },
    targetPlatformUserId: updated.id,
  });
}

export async function resendEmployeeInvitationForAdministration(employeeId: string) {
  const actor = await requirePlatformUser({ roles: ["administrator"] });
  const employee = await findEmployeeById(employeeId);
  const target = employee ? await findPlatformUserById(employee.platformUserId) : null;

  if (!target || target.status !== "invited") {
    throw new EmployeeAdministrationError("invitation_not_pending");
  }

  try {
    if (target.invitation.clerkInvitationId) {
      try {
        const client = await clerkClient();
        await client.invitations.revokeInvitation(target.invitation.clerkInvitationId);
      } catch {
        // An expired or previously revoked invitation is safe to replace.
      }
    }
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
    throw new EmployeeAdministrationError("invitation_failed");
  }
}

export async function endEmployeeEmploymentForAdministration({
  employeeId,
  endedOn,
}: {
  employeeId: string;
  endedOn: string;
}) {
  const actor = await requirePlatformUser({ roles: ["administrator"] });
  const employee = await findEmployeeById(employeeId);
  if (!employee) throw new EmployeeDomainError("employee_not_found");
  if (employee.platformUserId === actor.platformUser.id) {
    throw new EmployeeAdministrationError("own_employment_end");
  }

  const platformUserId = await endEmployeeEmployment({
    actorPlatformUserId: actor.platformUser.id,
    employeeId,
    endedOn,
  });
  let clerkSyncFailed = false;

  if (platformUserId) {
    const target = await findPlatformUserById(platformUserId);
    if (target?.clerkUserId) {
      try {
        const client = await clerkClient();
        await client.users.banUser(target.clerkUserId);
        await setPlatformUserClerkSyncStatus({ id: target.id, status: "synced" });
      } catch {
        clerkSyncFailed = true;
      }
    } else if (target) {
      await setPlatformUserClerkSyncStatus({ id: target.id, status: "synced" });
    }

    await recordAuthAudit({
      action: "account_deactivated",
      actorClerkUserId: actor.clerkUserId,
      actorPlatformUserId: actor.platformUser.id,
      metadata: { clerkSyncFailed, operation: "employment_end" },
      targetPlatformUserId: platformUserId,
    });
  }

  return { clerkSyncFailed };
}

export async function revealEmployeeIdentificationForAdministration(
  employeeId: string,
) {
  await requirePlatformUser({ roles: ["administrator"] });
  return revealEmployeeIdentificationValue(employeeId);
}
