import "server-only";
import { findLeaveConflicts } from "./leave-conflicts";
import { LeaveConflictError } from "../domain/leave-conflict";
import { CalendarHolidayIntegrationError } from "@/features/calendar/integrations/nager-date-calendar-adapter";
import { canCancelLeave } from "../domain/leave-policy";

import type { PlatformRole, PlatformUser } from "@/features/auth/domain/platform-user";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";
import { findPlatformUserById } from "@/features/auth/server/platform-user-repository";
import { getTodayInCostaRica } from "@/features/calendar/domain/calendar-utils";
import { formatEmployeePreferredDisplayName } from "@/features/employees/domain/employee";
import { objectIdStringSchema } from "@/features/employees/domain/shared";
import { ptoPeopleIntegration } from "@/features/employees/integrations/pto-people-adapter";
import { findEffectiveEmployeeAssignment } from "@/features/employees/server/assignment-repository";
import {
  findEmployeeById,
  findEmployeeByPlatformUserId,
  listEmployeeDirectory,
} from "@/features/employees/server/employee-repository";
import {
  PTO_SCHEDULE_DURATION_POLICY_VERSION,
  PtoDomainError,
  ptoCategoryConsumesBalance,
  ptoDraftCommandSchema,
  ptoDraftInputSchema,
  type PtoDraftCommand,
  type PtoDraftInput,
  type PtoRequest,
} from "@/features/pto/domain/pto";
import { PtoScheduleCalculationError } from "@/features/pto/integrations/pto-scheduling-port";
import {
  adjustPtoBalance,
  cancelPtoRequest,
  createApprovedPtoRequestAsAdministrator,
  createOpeningPtoBalance,
  createPtoDraft,
  decidePtoRequest,
  findPtoBalance,
  findPtoRequestById,
  getPtoRequestWarnings,
  listApprovedPtoInRange,
  listPendingPtoApprovals,
  listPtoBalanceLedger,
  listPtoRequestsForAdministration,
  listPtoRequestsForRequester,
  listUpcomingApprovedProxyPtoRequests,
  reassignPtoRequestApprover,
  submitPtoDraft,
  updatePtoDraft,
} from "@/features/pto/server/pto-repository";
import type { PtoRequestView } from "@/features/pto/view-models/pto-view";
import { ptoSchedulingIntegration } from "@/features/scheduling/integrations/pto-scheduling-adapter";

async function calculateDraftDuration(
  employeeId: string,
  request: PtoDraftCommand,
): Promise<PtoDraftInput> {
  let calculation;

  try {
    calculation = await ptoSchedulingIntegration.calculateFullDayLeave({
      employeeId,
      endDate: request.endDate,
      startDate: request.startDate,
    });
  } catch (error) {
    if (error instanceof CalendarHolidayIntegrationError)
      throw new PtoDomainError("holidays_unavailable");
    if (error instanceof PtoScheduleCalculationError) {
      throw new PtoDomainError("schedule_incomplete");
    }

    throw error;
  }

  if (calculation.workingDates.length === 0) {
    throw new PtoDomainError("no_scheduled_workdays");
  }

  if (request.requestedPortion === "half" && calculation.workingDates.length !== 1) {
    throw new PtoDomainError("partial_day_range");
  }

  return ptoDraftInputSchema.parse({
    ...request,
    durationCalculation: {
      ...calculation,
      calculatedAt: new Date(),
      calculationPolicyVersion: PTO_SCHEDULE_DURATION_POLICY_VERSION,
    },
    durationUnits:
      request.requestedPortion === "half" ? 1 : calculation.workingDates.length * 2,
  });
}

export async function previewLeaveDuration(
  input: PtoDraftCommand,
  employeeId?: string,
  requestId?: string,
) {
  const request = ptoDraftCommandSchema.parse(input);
  if (requestId) objectIdStringSchema.parse(requestId);
  async function check(id: string) {
    if (requestId) {
      const existing = await findPtoRequestById(requestId);
      if (!existing || existing.requesterEmployeeId !== id)
        throw new PtoDomainError("forbidden");
    }
    const conflicts = await findLeaveConflicts(id, request, requestId);
    if (conflicts.length) throw new LeaveConflictError(conflicts);
  }
  if (employeeId) {
    await requirePlatformUser({ roles: ["administrator"] });
    objectIdStringSchema.parse(employeeId);
    const employee = await findEmployeeById(employeeId);
    if (!employee || employee.employmentStatus !== "active")
      throw new PtoDomainError("employee_missing");
    await check(employeeId);
    return (await calculateDraftDuration(employeeId, request)).durationUnits;
  }
  const { employee } = await requirePtoEmployee();
  await check(employee.id);
  return (await calculateDraftDuration(employee.id, request)).durationUnits;
}

async function requirePtoEmployee() {
  const { platformUser } = await requirePlatformUser();
  const employee = await findEmployeeByPlatformUserId(platformUser.id);
  if (!employee || employee.employmentStatus !== "active") {
    throw new PtoDomainError("employee_missing");
  }
  return { employee, platformUser };
}

async function getPlatformUserName(platformUserId: string | null) {
  if (!platformUserId) return null;
  return (await findPlatformUserById(platformUserId))?.displayName ?? "Usuario";
}

async function toRequestView(request: PtoRequest): Promise<PtoRequestView> {
  const employee = await findEmployeeById(request.requesterEmployeeId);
  return {
    ...request,
    approverName: request.assignedApproverPlatformUserId
      ? await getPlatformUserName(request.assignedApproverPlatformUserId)
      : request.status === "draft"
        ? null
        : "Cualquier administrador activo",
    createdByName:
      request.createdByPlatformUserId !== request.requesterPlatformUserId
        ? await getPlatformUserName(request.createdByPlatformUserId)
        : null,
    requesterName: employee
      ? formatEmployeePreferredDisplayName(employee)
      : "Colaborador",
  };
}

async function toRequestViews(requests: PtoRequest[]): Promise<PtoRequestView[]> {
  if (requests.length === 0) return [];
  const names = await ptoPeopleIntegration.getDisplayNames({
    employeeIds: [...new Set(requests.map((request) => request.requesterEmployeeId))],
    platformUserIds: [
      ...new Set(
        requests
          .flatMap((request) => [
            request.assignedApproverPlatformUserId,
            request.createdByPlatformUserId,
          ])
          .filter((id): id is string => Boolean(id)),
      ),
    ],
  });
  return requests.map((request) => ({
    ...request,
    requesterName: names.employees.get(request.requesterEmployeeId) ?? "Colaborador",
    approverName: request.assignedApproverPlatformUserId
      ? (names.platformUsers.get(request.assignedApproverPlatformUserId) ?? "Usuario")
      : request.status === "draft"
        ? null
        : "Cualquier administrador activo",
    createdByName:
      request.createdByPlatformUserId !== request.requesterPlatformUserId
        ? (names.platformUsers.get(request.createdByPlatformUserId) ?? "Usuario")
        : null,
  }));
}

async function resolveSubmissionApprover({
  platformUser,
  requesterEmployeeId,
}: {
  platformUser: PlatformUser;
  requesterEmployeeId: string;
}) {
  if (platformUser.role === "collaborator") {
    const assignment = await findEffectiveEmployeeAssignment({
      employeeId: requesterEmployeeId,
      onDate: getTodayInCostaRica(),
    });
    if (!assignment?.managerEmployeeId) {
      throw new PtoDomainError("approver_ineligible");
    }
    const manager = await findEmployeeById(assignment.managerEmployeeId);
    const approver = manager
      ? await findPlatformUserById(manager.platformUserId)
      : null;
    if (
      !manager ||
      manager.employmentStatus !== "active" ||
      !approver ||
      approver.status !== "active" ||
      !["administrator", "supervisor"].includes(approver.role) ||
      approver.id === platformUser.id
    ) {
      throw new PtoDomainError("approver_ineligible");
    }
    return approver.id;
  }

  return null;
}

export async function getPtoDashboard() {
  const { platformUser } = await requirePlatformUser();
  const employee = await findEmployeeByPlatformUserId(platformUser.id);
  if (
    (!employee || employee.employmentStatus !== "active") &&
    platformUser.role !== "administrator"
  ) {
    throw new PtoDomainError("employee_missing");
  }
  const [balance, ownRequests, pendingApprovals] = await Promise.all([
    employee ? findPtoBalance(employee.id) : Promise.resolve(null),
    employee ? listPtoRequestsForRequester(employee.id) : Promise.resolve([]),
    platformUser.role === "collaborator"
      ? Promise.resolve([])
      : listPendingPtoApprovals(platformUser.id, platformUser.role === "administrator"),
  ]);
  return {
    balanceUnits: balance?.currentBalanceUnits ?? null,
    canManage: platformUser.role === "administrator",
    canRequest: employee?.employmentStatus === "active",
    employeeName: employee
      ? formatEmployeePreferredDisplayName(employee)
      : platformUser.displayName,
    ownRequests: await toRequestViews(ownRequests),
    pendingApprovals: await toRequestViews(pendingApprovals),
  };
}

export async function getPtoAdministrationDashboard() {
  const { platformUser } = await requirePlatformUser({ roles: ["administrator"] });
  const [requests, employees, administratorEmployee] = await Promise.all([
    listPtoRequestsForAdministration(),
    listEmployeeDirectory(),
    findEmployeeByPlatformUserId(platformUser.id),
  ]);
  const views = await toRequestViews(requests);
  views.sort(
    (first, second) =>
      Number(second.status === "pending") - Number(first.status === "pending") ||
      second.updatedAt.getTime() - first.updatedAt.getTime(),
  );
  return {
    counts: {
      all: views.length,
      approved: views.filter((request) => request.status === "approved").length,
      cancelled: views.filter((request) => request.status === "cancelled").length,
      denied: views.filter((request) => request.status === "denied").length,
      pending: views.filter((request) => request.status === "pending").length,
    },
    collaborators: employees
      .filter(
        (employee) =>
          employee.employmentStatus === "active" &&
          employee.id !== administratorEmployee?.id,
      )
      .map((employee) => ({
        displayName: employee.displayName,
        id: employee.id,
      })),
    requests: views,
  };
}

export async function getPtoRequestDetail(requestId: string) {
  const { platformUser } = await requirePlatformUser();
  if (!objectIdStringSchema.safeParse(requestId).success) return null;
  const request = await findPtoRequestById(requestId);
  if (!request) return null;
  const isRequester = request.requesterPlatformUserId === platformUser.id;
  const isApprover =
    platformUser.role !== "collaborator" &&
    request.assignedApproverPlatformUserId === platformUser.id;
  const isAdministratorProxy =
    platformUser.role === "administrator" &&
    request.createdByPlatformUserId !== request.requesterPlatformUserId;
  if (!isRequester && !isApprover && platformUser.role !== "administrator") {
    throw new PtoDomainError("forbidden");
  }
  const currentApprover = request.assignedApproverPlatformUserId
    ? await findPlatformUserById(request.assignedApproverPlatformUserId)
    : null;
  const canReassign =
    platformUser.role === "administrator" &&
    request.status === "pending" &&
    request.assignedApproverPlatformUserId !== null &&
    (currentApprover?.status !== "active" || currentApprover.role === "collaborator");
  let reassignmentOptions: Array<{ displayName: string; id: string }> = [];
  if (canReassign) {
    const requester = await findPlatformUserById(request.requesterPlatformUserId);
    if (requester) {
      if (requester.role === "collaborator") {
        try {
          const eligibleId = await resolveSubmissionApprover({
            platformUser: requester,
            requesterEmployeeId: request.requesterEmployeeId,
          });
          const eligible = eligibleId ? await findPlatformUserById(eligibleId) : null;
          if (eligible) {
            reassignmentOptions = [
              { displayName: eligible.displayName, id: eligible.id },
            ];
          }
        } catch {
          reassignmentOptions = [];
        }
      }
    }
  }
  const warnings = await (request.status === "draft" || request.status === "pending"
    ? getPtoRequestWarnings(request)
    : Promise.resolve({
        hasOverlap: false,
        projectedBalanceUnits: null,
        wouldBeNegative: false,
      }));
  return {
    canCancel:
      (isRequester || platformUser.role === "administrator") &&
      canCancelLeave({
        ...request,
        today: getTodayInCostaRica(),
        administrator: platformUser.role === "administrator" && !isRequester,
      }),
    cancellationNoteRequired: platformUser.role === "administrator" && !isRequester,
    canDecide:
      request.status === "pending" &&
      !isRequester &&
      (isApprover || platformUser.role === "administrator"),
    canEdit: (isRequester || isAdministratorProxy) && request.status === "draft",
    canReassign,
    canSubmit: (isRequester || isAdministratorProxy) && request.status === "draft",
    history: await Promise.all(
      request.statusHistory.map(async (entry) => ({
        actorName: (await getPlatformUserName(entry.actorPlatformUserId)) ?? "Usuario",
        from: entry.from,
        occurredAt: entry.occurredAt,
        to: entry.to,
      })),
    ),
    request: await toRequestView(request),
    reassignmentOptions,
    proxyEmployeeId: isAdministratorProxy ? request.requesterEmployeeId : null,
    warnings,
  };
}

export async function createOwnPtoDraft(request: PtoDraftCommand) {
  const { employee, platformUser } = await requirePtoEmployee();
  return createPtoDraft({
    actorPlatformUserId: platformUser.id,
    employeeId: employee.id,
    request: await calculateDraftDuration(
      employee.id,
      ptoDraftCommandSchema.parse(request),
    ),
  });
}

export async function createAndApproveEmployeePtoRequestAsAdministrator(
  employeeId: string,
  request: PtoDraftCommand,
) {
  const { platformUser } = await requirePlatformUser({ roles: ["administrator"] });
  const employee = await findEmployeeById(employeeId);
  if (!employee || employee.employmentStatus !== "active") {
    throw new PtoDomainError("employee_missing");
  }
  const requester = await findPlatformUserById(employee.platformUserId);
  if (!requester) throw new PtoDomainError("employee_missing");
  if (requester.id === platformUser.id) throw new PtoDomainError("self_approval");

  return createApprovedPtoRequestAsAdministrator({
    actorPlatformUserId: platformUser.id,
    employeeId: employee.id,
    request: await calculateDraftDuration(
      employee.id,
      ptoDraftCommandSchema.parse(request),
    ),
    requesterPlatformUserId: requester.id,
  });
}

export async function updateEmployeePtoDraftAsAdministrator(
  employeeId: string,
  requestId: string,
  request: PtoDraftCommand,
) {
  const { platformUser } = await requirePlatformUser({ roles: ["administrator"] });
  const existing = await findPtoRequestById(requestId);
  if (
    !existing ||
    existing.requesterEmployeeId !== employeeId ||
    existing.createdByPlatformUserId === existing.requesterPlatformUserId
  ) {
    throw new PtoDomainError("forbidden");
  }
  return updatePtoDraft({
    actorPlatformUserId: platformUser.id,
    administratorOverride: true,
    request: await calculateDraftDuration(
      employeeId,
      ptoDraftCommandSchema.parse(request),
    ),
    requestId,
  });
}

export async function updateOwnPtoDraft(requestId: string, request: PtoDraftCommand) {
  const { employee, platformUser } = await requirePtoEmployee();
  return updatePtoDraft({
    actorPlatformUserId: platformUser.id,
    request: await calculateDraftDuration(
      employee.id,
      ptoDraftCommandSchema.parse(request),
    ),
    requestId,
  });
}

export async function submitOwnPtoDraft({ requestId }: { requestId: string }) {
  const { platformUser } = await requirePlatformUser();
  const request = await findPtoRequestById(requestId);
  if (!request) throw new PtoDomainError("request_missing");
  const isRequester = request.requesterPlatformUserId === platformUser.id;
  const isAdministratorProxy =
    platformUser.role === "administrator" &&
    request.createdByPlatformUserId !== request.requesterPlatformUserId;
  if (!isRequester && !isAdministratorProxy) {
    throw new PtoDomainError("forbidden");
  }
  const employee = await findEmployeeById(request.requesterEmployeeId);
  const requester = await findPlatformUserById(request.requesterPlatformUserId);
  if (
    !employee ||
    employee.employmentStatus !== "active" ||
    !requester ||
    (!isAdministratorProxy && requester.status !== "active")
  ) {
    throw new PtoDomainError("employee_missing");
  }
  if (
    ptoCategoryConsumesBalance[request.category] &&
    !(await findPtoBalance(employee.id))
  ) {
    throw new PtoDomainError("balance_missing");
  }
  const approverPlatformUserId = await resolveSubmissionApprover({
    platformUser: requester,
    requesterEmployeeId: employee.id,
  });
  const calculatedRequest = await calculateDraftDuration(employee.id, {
    category: request.category,
    collaboratorNote: request.collaboratorNote,
    endDate: request.endDate,
    requestedPortion: request.requestedPortion,
    startDate: request.startDate,
  });
  return submitPtoDraft({
    actorPlatformUserId: platformUser.id,
    ...(isAdministratorProxy && { administratorOverride: true }),
    approverPlatformUserId,
    duration: {
      calculation: calculatedRequest.durationCalculation!,
      units: calculatedRequest.durationUnits,
    },
    expectedUpdatedAt: request.updatedAt,
    requestId,
  });
}

export async function submitPtoRequestWithConfirmation({
  confirmWarnings,
  requestId,
}: {
  confirmWarnings: boolean;
  requestId: string;
}) {
  const detail = await getPtoRequestDetail(requestId);
  if (!detail) throw new PtoDomainError("request_missing");

  const hasWarnings = detail.warnings.wouldBeNegative;
  if (hasWarnings && !confirmWarnings) {
    return {
      proxyEmployeeId: detail.proxyEmployeeId,
      requiresConfirmation: true,
    };
  }

  await submitOwnPtoDraft({ requestId });
  return {
    proxyEmployeeId: detail.proxyEmployeeId,
    requiresConfirmation: false,
  };
}

export async function cancelOwnPtoRequest(requestId: string, note?: string) {
  const { platformUser } = await requirePlatformUser();
  const request = await findPtoRequestById(requestId);
  if (!request) throw new PtoDomainError("request_missing");
  const isRequester = request.requesterPlatformUserId === platformUser.id;
  const isAdministratorProxy = platformUser.role === "administrator" && !isRequester;
  if (!isRequester && !isAdministratorProxy) {
    throw new PtoDomainError("forbidden");
  }
  return cancelPtoRequest({
    actorPlatformUserId: platformUser.id,
    administratorOverride: isAdministratorProxy,
    note,
    requestId,
  });
}

export async function decideAssignedPtoRequest(input: {
  decision: "approved" | "denied";
  decisionNote: string | null;
  requestId: string;
}) {
  const { platformUser } = await requirePlatformUser({
    roles: ["administrator", "supervisor"],
  });
  if (platformUser.role === "collaborator") throw new PtoDomainError("forbidden");
  return decidePtoRequest({
    actorPlatformUserId: platformUser.id,
    administratorOverride: platformUser.role === "administrator",
    ...input,
  });
}

export async function decidePtoRequestWithConfirmation(
  input: {
    decision: "approved" | "denied";
    decisionNote: string | null;
    requestId: string;
  } & { confirmWarnings: boolean },
) {
  const detail = await getPtoRequestDetail(input.requestId);
  if (!detail) throw new PtoDomainError("request_missing");

  const hasWarnings = detail.warnings.wouldBeNegative;
  if (input.decision === "approved" && hasWarnings && !input.confirmWarnings) {
    return { requiresConfirmation: true };
  }

  await decideAssignedPtoRequest({
    decision: input.decision,
    decisionNote: input.decisionNote,
    requestId: input.requestId,
  });
  return { requiresConfirmation: false };
}

export async function reassignOrphanedPtoApprover(input: {
  approverPlatformUserId: string;
  requestId: string;
}) {
  const { platformUser } = await requirePlatformUser({ roles: ["administrator"] });
  const detail = await findPtoRequestById(input.requestId);
  if (!detail || detail.status !== "pending") {
    throw new PtoDomainError("stale_status");
  }
  const requester = await findPlatformUserById(detail.requesterPlatformUserId);
  if (!requester) throw new PtoDomainError("approver_ineligible");
  const eligibleId = await resolveSubmissionApprover({
    platformUser: requester,
    requesterEmployeeId: detail.requesterEmployeeId,
  });
  if (!eligibleId || eligibleId !== input.approverPlatformUserId) {
    throw new PtoDomainError("approver_ineligible");
  }
  return reassignPtoRequestApprover({
    actorPlatformUserId: platformUser.id,
    approverPlatformUserId: eligibleId,
    requestId: input.requestId,
  });
}

export async function getEmployeePtoAdministration(employeeId: string) {
  await requirePlatformUser({ roles: ["administrator"] });
  const employee = await findEmployeeById(employeeId);
  if (!employee) return null;
  const [balance, ledger] = await Promise.all([
    findPtoBalance(employee.id),
    listPtoBalanceLedger(employee.id),
  ]);
  return {
    balanceUnits: balance?.currentBalanceUnits ?? null,
    employeeName: formatEmployeePreferredDisplayName(employee),
    ledger: await Promise.all(
      ledger.map(async (entry) => ({
        actorName: entry.actorPlatformUserId
          ? ((await getPlatformUserName(entry.actorPlatformUserId.toHexString())) ??
            "Usuario")
          : "Sistema",
        balanceAfterUnits: entry.balanceAfterUnits,
        balanceBeforeUnits: entry.balanceBeforeUnits,
        createdAt: entry.createdAt,
        deltaUnits: entry.deltaUnits,
        id: entry._id.toHexString(),
        kind: entry.kind,
        reason: entry.reason,
        requestId: entry.requestId?.toHexString() ?? null,
      })),
    ),
    openingBalanceUnits: balance?.openingBalanceUnits ?? null,
  };
}

export async function openEmployeePtoBalance(
  employeeId: string,
  openingBalanceUnits: number,
) {
  const { platformUser } = await requirePlatformUser({ roles: ["administrator"] });
  const employee = await findEmployeeById(employeeId);
  if (!employee) throw new PtoDomainError("employee_missing");
  return createOpeningPtoBalance({
    actorPlatformUserId: platformUser.id,
    employeeId,
    openingBalanceUnits,
  });
}

export async function adjustEmployeePtoBalance(input: {
  deltaUnits: number;
  employeeId: string;
  reason: string;
}) {
  const { platformUser } = await requirePlatformUser({ roles: ["administrator"] });
  return adjustPtoBalance({ actorPlatformUserId: platformUser.id, ...input });
}

export async function listVisibleApprovedPtoForCalendar({
  endDate,
  platformUserId,
  role,
  startDate,
}: {
  endDate: string;
  platformUserId: string;
  role: PlatformRole;
  startDate: string;
}) {
  const requests = await listApprovedPtoInRange({
    endDate,
    platformUserId,
    role,
    startDate,
  });
  const views = await toRequestViews(requests);
  return views.map(({ durationUnits, endDate, id, requesterName, startDate }) => ({
    durationUnits,
    endDate,
    id,
    requesterName,
    startDate,
  }));
}

export async function listUpcomingProxyPtoNotifications(
  platformUserId: string,
  limit = 5,
) {
  return listUpcomingApprovedProxyPtoRequests({
    limit,
    platformUserId,
    today: getTodayInCostaRica(),
  });
}
