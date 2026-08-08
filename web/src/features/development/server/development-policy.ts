import "server-only";

import type {
  PlatformRole,
  PlatformUserStatus,
} from "@/features/auth/domain/platform-user";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";
import { DevelopmentDomainError } from "@/features/development/domain/shared";
import { findDevelopmentEmployeeByPlatformUserId } from "@/features/development/server/development-employee-read-repository";

export type DevelopmentOperation =
  | "finalize"
  | "list"
  | "manage_catalog"
  | "read_narrative"
  | "read_shared"
  | "void"
  | "write";

export type DevelopmentAccessDecision =
  | { granted: true }
  | {
      granted: false;
      reason: "deactivated" | "forbidden" | "mfa_required";
    };

export function getDevelopmentAccessDecision({
  actorEmployeeId,
  actorMfaEnabled,
  actorRole,
  actorStatus,
  operation,
  targetEmployeeId,
}: {
  actorEmployeeId: string | null;
  actorMfaEnabled: boolean;
  actorRole: PlatformRole;
  actorStatus: PlatformUserStatus;
  operation: DevelopmentOperation;
  targetEmployeeId: string | null;
}): DevelopmentAccessDecision {
  if (actorStatus !== "active") {
    return { granted: false, reason: "deactivated" };
  }

  if (actorRole === "administrator") {
    return actorMfaEnabled
      ? { granted: true }
      : { granted: false, reason: "mfa_required" };
  }

  if (
    actorRole === "collaborator" &&
    operation === "read_shared" &&
    actorEmployeeId !== null &&
    targetEmployeeId === actorEmployeeId
  ) {
    return { granted: true };
  }

  // Supervisors intentionally receive no implicit access in MVP. A future
  // capability such as development_records:manage belongs at this seam.
  return { granted: false, reason: "forbidden" };
}

export async function requireDevelopmentAdministrator(operation: DevelopmentOperation) {
  const actor = await requirePlatformUser({ roles: ["administrator"] });
  const decision = getDevelopmentAccessDecision({
    actorEmployeeId: null,
    actorMfaEnabled: actor.clerkTwoFactorEnabled,
    actorRole: actor.platformUser.role,
    actorStatus: actor.platformUser.status,
    operation,
    targetEmployeeId: null,
  });

  if (!decision.granted) {
    throw new DevelopmentDomainError("forbidden");
  }

  return actor;
}

export async function requireOwnDevelopmentSubject() {
  const actor = await requirePlatformUser();
  const employee = await findDevelopmentEmployeeByPlatformUserId(actor.platformUser.id);

  if (!employee || employee.employmentStatus !== "active") {
    throw new DevelopmentDomainError("employee_not_found");
  }

  const decision = getDevelopmentAccessDecision({
    actorEmployeeId: employee.id,
    actorMfaEnabled: actor.clerkTwoFactorEnabled,
    actorRole: actor.platformUser.role,
    actorStatus: actor.platformUser.status,
    operation: "read_shared",
    targetEmployeeId: employee.id,
  });

  if (!decision.granted) {
    throw new DevelopmentDomainError("forbidden");
  }

  return { actor, employeeId: employee.id };
}

export function assertDevelopmentResourceTarget({
  requestedEmployeeId,
  resourceEmployeeId,
}: {
  requestedEmployeeId: string;
  resourceEmployeeId: string;
}) {
  if (requestedEmployeeId !== resourceEmployeeId) {
    // Deliberately do not distinguish a cross-employee record from a missing one.
    throw new DevelopmentDomainError("record_not_found");
  }
}
