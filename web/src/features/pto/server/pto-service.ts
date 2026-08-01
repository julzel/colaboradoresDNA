import "server-only";

import { ObjectId } from "mongodb";

import type { PlatformRole, PlatformUser } from "@/features/auth/domain/platform-user";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";
import { findPlatformUserById } from "@/features/auth/server/platform-user-repository";
import { getTodayInCostaRica } from "@/features/calendar/domain/calendar-utils";
import { formatEmployeePreferredDisplayName } from "@/features/employees/domain/employee";
import { findEffectiveEmployeeAssignment } from "@/features/employees/server/assignment-repository";
import {
  findEmployeeById,
  findEmployeeByPlatformUserId,
} from "@/features/employees/server/employee-repository";
import {
  PtoDomainError,
  ptoDraftInputSchema,
  type PtoDraftInput,
} from "@/features/pto/domain/pto";
import {
  adjustPtoBalance,
  cancelPtoRequest,
  createOpeningPtoBalance,
  createPtoDraft,
  decidePtoRequest,
  findPtoBalance,
  findPtoRequestById,
  getPtoRequestWarnings,
  getPtoSupportingCollections,
  listPendingPtoApprovals,
  listPtoBalanceLedger,
  listPtoRequestsForAdministration,
  listPtoRequestsForRequester,
  reassignPtoRequestApprover,
  submitPtoDraft,
  updatePtoDraft,
  type PtoRequest,
} from "@/features/pto/server/pto-repository";

export type PtoRequestView = PtoRequest & {
  approverName: string | null;
  requesterName: string;
};

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
    requesterName: employee
      ? formatEmployeePreferredDisplayName(employee)
      : "Colaborador",
  };
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
      approver.role !== "supervisor" ||
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
    listPendingPtoApprovals(platformUser.id, platformUser.role === "administrator"),
  ]);
  return {
    balanceUnits: balance?.currentBalanceUnits ?? null,
    canManage: platformUser.role === "administrator",
    canRequest: employee?.employmentStatus === "active",
    employeeName: employee
      ? formatEmployeePreferredDisplayName(employee)
      : platformUser.displayName,
    ownRequests: await Promise.all(ownRequests.map(toRequestView)),
    pendingApprovals: await Promise.all(pendingApprovals.map(toRequestView)),
  };
}

export async function getPtoAdministrationDashboard() {
  await requirePlatformUser({ roles: ["administrator"] });
  const requests = await listPtoRequestsForAdministration();
  const views = await Promise.all(requests.map(toRequestView));
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
    requests: views,
  };
}

export async function getPtoRequestDetail(requestId: string) {
  const { platformUser } = await requirePlatformUser();
  const request = await findPtoRequestById(requestId);
  if (!request) return null;
  const isRequester = request.requesterPlatformUserId === platformUser.id;
  const isApprover = request.assignedApproverPlatformUserId === platformUser.id;
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
    currentApprover?.status !== "active";
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
    canCancel: isRequester && ["draft", "pending"].includes(request.status),
    canDecide:
      request.status === "pending" &&
      !isRequester &&
      (isApprover || platformUser.role === "administrator"),
    canEdit: isRequester && request.status === "draft",
    canReassign,
    canSubmit: isRequester && request.status === "draft",
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
    warnings,
  };
}

export async function createOwnPtoDraft(request: PtoDraftInput) {
  const { employee, platformUser } = await requirePtoEmployee();
  return createPtoDraft({
    actorPlatformUserId: platformUser.id,
    employeeId: employee.id,
    request: ptoDraftInputSchema.parse(request),
  });
}

export async function updateOwnPtoDraft(requestId: string, request: PtoDraftInput) {
  const { platformUser } = await requirePtoEmployee();
  return updatePtoDraft({
    actorPlatformUserId: platformUser.id,
    request: ptoDraftInputSchema.parse(request),
    requestId,
  });
}

export async function submitOwnPtoDraft({ requestId }: { requestId: string }) {
  const { employee, platformUser } = await requirePtoEmployee();
  if (!(await findPtoBalance(employee.id))) {
    throw new PtoDomainError("balance_missing");
  }
  const approverPlatformUserId = await resolveSubmissionApprover({
    platformUser,
    requesterEmployeeId: employee.id,
  });
  return submitPtoDraft({
    actorPlatformUserId: platformUser.id,
    approverPlatformUserId,
    requestId,
  });
}

export async function cancelOwnPtoRequest(requestId: string) {
  const { platformUser } = await requirePtoEmployee();
  return cancelPtoRequest({ actorPlatformUserId: platformUser.id, requestId });
}

export async function decideAssignedPtoRequest(input: {
  decision: "approved" | "denied";
  decisionNote: string | null;
  requestId: string;
}) {
  const { platformUser } = await requirePlatformUser();
  return decidePtoRequest({
    actorPlatformUserId: platformUser.id,
    administratorOverride: platformUser.role === "administrator",
    ...input,
  });
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
        actorName:
          (await getPlatformUserName(entry.actorPlatformUserId.toHexString())) ??
          "Usuario",
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
  const { employees, requests } = await getPtoSupportingCollections();
  const platformObjectId = new ObjectId(platformUserId);
  const visibility =
    role === "administrator"
      ? {}
      : {
          $or: [
            { requesterPlatformUserId: platformObjectId },
            { assignedApproverPlatformUserId: platformObjectId },
          ],
        };
  const documents = await requests
    .find({
      ...visibility,
      endDate: { $gte: startDate },
      startDate: { $lte: endDate },
      status: "approved",
    })
    .sort({ startDate: 1 })
    .toArray();
  return Promise.all(
    documents.map(async (request) => {
      const employee = await employees.findOne({ _id: request.requesterEmployeeId });
      return {
        durationUnits: request.durationUnits,
        endDate: request.endDate,
        id: request._id.toHexString(),
        requesterName: employee
          ? formatEmployeePreferredDisplayName(employee)
          : "Colaborador",
        startDate: request.startDate,
      };
    }),
  );
}
