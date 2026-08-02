import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  decideAssignedPtoRequest,
  getPtoAdministrationDashboard,
  getPtoDashboard,
  submitOwnPtoDraft,
} from "@/features/pto/server/pto-service";

const mocks = vi.hoisted(() => ({
  findEffectiveEmployeeAssignment: vi.fn(),
  findEmployeeById: vi.fn(),
  findEmployeeByPlatformUserId: vi.fn(),
  findPlatformUserById: vi.fn(),
  findPtoBalance: vi.fn(),
  decidePtoRequest: vi.fn(),
  listPendingPtoApprovals: vi.fn(),
  listPtoRequestsForAdministration: vi.fn(),
  requirePlatformUser: vi.fn(),
  submitPtoDraft: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/features/auth/server/require-platform-user", () => ({
  requirePlatformUser: mocks.requirePlatformUser,
}));

vi.mock("@/features/auth/server/platform-user-repository", () => ({
  findPlatformUserById: mocks.findPlatformUserById,
}));

vi.mock("@/features/employees/server/assignment-repository", () => ({
  findEffectiveEmployeeAssignment: mocks.findEffectiveEmployeeAssignment,
}));

vi.mock("@/features/employees/server/employee-repository", () => ({
  findEmployeeById: mocks.findEmployeeById,
  findEmployeeByPlatformUserId: mocks.findEmployeeByPlatformUserId,
}));

vi.mock("@/features/pto/server/pto-repository", () => ({
  adjustPtoBalance: vi.fn(),
  cancelPtoRequest: vi.fn(),
  createOpeningPtoBalance: vi.fn(),
  createPtoDraft: vi.fn(),
  decidePtoRequest: mocks.decidePtoRequest,
  findPtoBalance: mocks.findPtoBalance,
  findPtoRequestById: vi.fn(),
  getPtoRequestWarnings: vi.fn(),
  getPtoSupportingCollections: vi.fn(),
  listPendingPtoApprovals: mocks.listPendingPtoApprovals,
  listPtoBalanceLedger: vi.fn(),
  listPtoRequestsForAdministration: mocks.listPtoRequestsForAdministration,
  listPtoRequestsForRequester: vi.fn(),
  reassignPtoRequestApprover: vi.fn(),
  submitPtoDraft: mocks.submitPtoDraft,
  updatePtoDraft: vi.fn(),
}));

const actorId = "507f1f77bcf86cd799439011";
const employeeId = "507f1f77bcf86cd799439012";
const approverId = "507f1f77bcf86cd799439013";
const managerEmployeeId = "507f1f77bcf86cd799439014";
const requestId = "507f1f77bcf86cd799439015";

describe("PTO submission routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findEmployeeByPlatformUserId.mockResolvedValue({
      employmentStatus: "active",
      id: employeeId,
    });
    mocks.findPtoBalance.mockResolvedValue({ currentBalanceUnits: 10 });
    mocks.submitPtoDraft.mockResolvedValue({ id: requestId });
    mocks.listPendingPtoApprovals.mockResolvedValue([]);
    mocks.listPtoRequestsForAdministration.mockResolvedValue([]);
  });

  it("routes a collaborator only to the active assigned supervisor", async () => {
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: { id: actorId, role: "collaborator" },
    });
    mocks.findEffectiveEmployeeAssignment.mockResolvedValue({ managerEmployeeId });
    mocks.findEmployeeById.mockResolvedValue({
      employmentStatus: "active",
      platformUserId: approverId,
    });
    mocks.findPlatformUserById.mockResolvedValue({
      id: approverId,
      role: "supervisor",
      status: "active",
    });

    await submitOwnPtoDraft({ requestId });

    expect(mocks.submitPtoDraft).toHaveBeenCalledWith({
      actorPlatformUserId: actorId,
      approverPlatformUserId: approverId,
      requestId,
    });
  });

  it("allows an active administrator to be the collaborator's assigned manager", async () => {
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: { id: actorId, role: "collaborator" },
    });
    mocks.findEffectiveEmployeeAssignment.mockResolvedValue({ managerEmployeeId });
    mocks.findEmployeeById.mockResolvedValue({
      employmentStatus: "active",
      platformUserId: approverId,
    });
    mocks.findPlatformUserById.mockResolvedValue({
      id: approverId,
      role: "administrator",
      status: "active",
    });

    await submitOwnPtoDraft({ requestId });

    expect(mocks.submitPtoDraft).toHaveBeenCalledWith({
      actorPlatformUserId: actorId,
      approverPlatformUserId: approverId,
      requestId,
    });
  });

  it("routes a supervisor to the shared administrator pool", async () => {
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: { id: actorId, role: "supervisor" },
    });
    await submitOwnPtoDraft({ requestId });

    expect(mocks.submitPtoDraft).toHaveBeenCalledWith({
      actorPlatformUserId: actorId,
      approverPlatformUserId: null,
      requestId,
    });
  });

  it("routes an administrator request to the shared administrator pool", async () => {
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: { id: actorId, role: "administrator" },
    });
    await submitOwnPtoDraft({ requestId });

    expect(mocks.submitPtoDraft).toHaveBeenCalledWith({
      actorPlatformUserId: actorId,
      approverPlatformUserId: null,
      requestId,
    });
  });

  it("allows any active administrator to decide a pending request", async () => {
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: { id: actorId, role: "administrator" },
    });

    await decideAssignedPtoRequest({
      decision: "approved",
      decisionNote: null,
      requestId,
    });

    expect(mocks.decidePtoRequest).toHaveBeenCalledWith({
      actorPlatformUserId: actorId,
      administratorOverride: true,
      decision: "approved",
      decisionNote: null,
      requestId,
    });
  });

  it("shows the shared queue to an administrator without requiring an employee profile", async () => {
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: {
        displayName: "Admin",
        id: actorId,
        role: "administrator",
      },
    });
    mocks.findEmployeeByPlatformUserId.mockResolvedValue(null);

    const dashboard = await getPtoDashboard();

    expect(mocks.listPendingPtoApprovals).toHaveBeenCalledWith(actorId, true);
    expect(dashboard.canRequest).toBe(false);
    expect(dashboard.pendingApprovals).toEqual([]);
  });

  it("returns organization-wide submitted requests for administration", async () => {
    const older = new Date("2026-07-01T12:00:00.000Z");
    const newer = new Date("2026-07-02T12:00:00.000Z");
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: { id: actorId, role: "administrator" },
    });
    mocks.findEmployeeById.mockResolvedValue({
      firstSurname: "Mora",
      givenNames: "Ana",
      preferredName: "Ana",
      secondSurname: null,
    });
    mocks.listPtoRequestsForAdministration.mockResolvedValue([
      {
        assignedApproverPlatformUserId: null,
        id: "507f1f77bcf86cd799439020",
        requesterEmployeeId: employeeId,
        status: "approved",
        updatedAt: newer,
      },
      {
        assignedApproverPlatformUserId: null,
        id: "507f1f77bcf86cd799439021",
        requesterEmployeeId: employeeId,
        status: "pending",
        updatedAt: older,
      },
    ]);

    const dashboard = await getPtoAdministrationDashboard();

    expect(mocks.requirePlatformUser).toHaveBeenCalledWith({
      roles: ["administrator"],
    });
    expect(dashboard.counts).toMatchObject({
      all: 2,
      approved: 1,
      pending: 1,
    });
    expect(dashboard.requests.map((request) => request.status)).toEqual([
      "pending",
      "approved",
    ]);
  });
});
