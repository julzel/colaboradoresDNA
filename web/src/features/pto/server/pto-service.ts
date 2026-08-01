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
  getGlobalPtoSettings,
  getPtoRequestWarnings,
  getPtoSupportingCollections,
  listActiveAdministratorOptions,
  listActivePtoApproverOptions,
  listPendingPtoApprovals,
  listPtoBalanceLedger,
  listPtoRequestsForRequester,
  reassignPtoRequestApprover,
  submitPtoDraft,
  setGlobalPtoSettings,
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
    approverName: await getPlatformUserName(request.assignedApproverPlatformUserId),
    requesterName: employee
      ? formatEmployeePreferredDisplayName(employee)
      : "Colaborador",
  };
}

async function resolveSubmissionApprover({
  platformUser,
  requesterEmployeeId,
  selectedAdministratorId,
}: {
  platformUser: PlatformUser;
  requesterEmployeeId: string;
  selectedAdministratorId: string | null | undefined;
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

  if (platformUser.role === "supervisor") {
    const setting = await getGlobalPtoSettings();
    const configuredId = setting?.supervisorApproverPlatformUserId.toHexString();
    const approver = configuredId ? await findPlatformUserById(configuredId) : null;
    if (!approver || approver.status !== "active" || approver.id === platformUser.id) {
      throw new PtoDomainError("approver_ineligible");
    }
    return approver.id;
  }

  if (!selectedAdministratorId) {
    throw new PtoDomainError("approver_ineligible");
  }
  const approver = await findPlatformUserById(selectedAdministratorId);
  if (
    !approver ||
    approver.status !== "active" ||
    approver.role !== "administrator" ||
    approver.id === platformUser.id
  ) {
    throw new PtoDomainError("approver_ineligible");
  }
  return approver.id;
}

export async function getPtoDashboard() {
  const { employee, platformUser } = await requirePtoEmployee();
  const [balance, ownRequests, pendingApprovals, administratorOptions] =
    await Promise.all([
      findPtoBalance(employee.id),
      listPtoRequestsForRequester(employee.id),
      listPendingPtoApprovals(platformUser.id),
      platformUser.role === "administrator"
        ? listActiveAdministratorOptions(platformUser.id)
        : Promise.resolve([]),
    ]);
  return {
    administratorOptions,
    balanceUnits: balance?.currentBalanceUnits ?? null,
    employeeName: formatEmployeePreferredDisplayName(employee),
    ownRequests: await Promise.all(ownRequests.map(toRequestView)),
    pendingApprovals: await Promise.all(pendingApprovals.map(toRequestView)),
    role: platformUser.role,
  };
}

export async function getPtoRequestDetail(requestId: string) {
  const { employee, platformUser } = await requirePtoEmployee();
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
    currentApprover?.status !== "active";
  let reassignmentOptions: Array<{ displayName: string; id: string }> = [];
  if (canReassign) {
    const requester = await findPlatformUserById(request.requesterPlatformUserId);
    if (requester) {
      if (requester.role === "administrator") {
        reassignmentOptions = await listActiveAdministratorOptions(requester.id);
      } else {
        try {
          const eligibleId = await resolveSubmissionApprover({
            platformUser: requester,
            requesterEmployeeId: request.requesterEmployeeId,
            selectedAdministratorId: null,
          });
          const eligible = await findPlatformUserById(eligibleId);
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
  const [warnings, administratorOptions] = await Promise.all([
    request.status === "draft" || request.status === "pending"
      ? getPtoRequestWarnings(request)
      : Promise.resolve({
          hasOverlap: false,
          projectedBalanceUnits: null,
          wouldBeNegative: false,
        }),
    isRequester && platformUser.role === "administrator" && request.status === "draft"
      ? listActiveAdministratorOptions(platformUser.id)
      : Promise.resolve([]),
  ]);
  return {
    administratorOptions,
    canCancel: isRequester && ["draft", "pending"].includes(request.status),
    canDecide: isApprover && request.status === "pending",
    canEdit: isRequester && request.status === "draft",
    canReassign,
    canSubmit: isRequester && request.status === "draft",
    currentEmployeeId: employee.id,
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

export async function submitOwnPtoDraft({
  requestId,
  selectedAdministratorId,
}: {
  requestId: string;
  selectedAdministratorId?: string | null;
}) {
  const { employee, platformUser } = await requirePtoEmployee();
  if (!(await findPtoBalance(employee.id))) {
    throw new PtoDomainError("balance_missing");
  }
  const approverPlatformUserId = await resolveSubmissionApprover({
    platformUser,
    requesterEmployeeId: employee.id,
    selectedAdministratorId,
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
  const { platformUser } = await requirePtoEmployee();
  return decidePtoRequest({ actorPlatformUserId: platformUser.id, ...input });
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
    selectedAdministratorId:
      requester.role === "administrator" ? input.approverPlatformUserId : null,
  });
  if (eligibleId !== input.approverPlatformUserId) {
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

export async function getPtoAdministrationSettings() {
  await requirePlatformUser({ roles: ["administrator"] });
  const [setting, options] = await Promise.all([
    getGlobalPtoSettings(),
    listActivePtoApproverOptions(),
  ]);
  const selectedId = setting?.supervisorApproverPlatformUserId.toHexString() ?? null;
  return {
    options,
    selectedId,
    selectedName:
      options.find((option) => option.id === selectedId)?.displayName ?? null,
  };
}

export async function updatePtoAdministrationSettings(
  supervisorApproverPlatformUserId: string,
) {
  const { platformUser } = await requirePlatformUser({ roles: ["administrator"] });
  return setGlobalPtoSettings({
    actorPlatformUserId: platformUser.id,
    supervisorApproverPlatformUserId,
  });
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
