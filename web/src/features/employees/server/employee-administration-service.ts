import "server-only";

import { revokeIdentitySessions } from "@/features/auth/server/auth-provider";

import { recordAuthAudit } from "@/features/auth/server/auth-audit-repository";
import {
  safelySendPlatformInvitation,
  sendPlatformInvitation,
} from "@/features/auth/server/invitation-service";
import {
  findPlatformUserById,
  markPlatformUserInvitationFailed,
  setPlatformUserAuthSyncStatus,
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
  input: CreateEmployeeWithAccessInput & { sendInvitation: boolean },
) {
  const { sendInvitation, ...employeeInput } = input;
  const result = await createEmployeeWithAccess(employeeInput);
  const invitationSent = sendInvitation
    ? await safelySendPlatformInvitation({
        email: result.platformUser.normalizedEmail,
        platformUserId: result.platformUser.id,
      })
    : false;
  const invitationDisposition = !sendInvitation
    ? "deferred"
    : invitationSent
      ? "sent"
      : "failed";

  await recordAuthAudit({
    action:
      invitationDisposition === "sent"
        ? "invitation_created"
        : invitationDisposition === "deferred"
          ? "invitation_deferred"
          : "invitation_failed",
    actorAuthUserId: result.actor.authUserId ?? "system",
    actorPlatformUserId: result.actor.id,
    metadata: { role: result.platformUser.role },
    targetPlatformUserId: result.platformUser.id,
  });

  return { employeeId: result.employee.id, invitationDisposition };
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
    actorAuthUserId: actor.authUserId,
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
  let authSyncFailed = false;

  if (platformUserId) {
    const target = await findPlatformUserById(platformUserId);
    if (target?.authUserId) {
      try {
        await revokeIdentitySessions(target.authUserId);
        await setPlatformUserAuthSyncStatus({ id: target.id, status: "synced" });
      } catch {
        authSyncFailed = true;
      }
    } else if (target) {
      await setPlatformUserAuthSyncStatus({ id: target.id, status: "synced" });
    }

    await recordAuthAudit({
      action: "account_deactivated",
      actorAuthUserId: actor.authUserId,
      actorPlatformUserId: actor.platformUser.id,
      metadata: { authSyncFailed, operation: "employment_end" },
      targetPlatformUserId: platformUserId,
    });
  }

  return { authSyncFailed };
}

export async function revealEmployeeIdentificationForAdministration(
  employeeId: string,
) {
  await requirePlatformUser({ roles: ["administrator"] });
  return revealEmployeeIdentificationValue(employeeId);
}
