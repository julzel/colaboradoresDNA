import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { submitOwnPtoDraft } from "@/features/pto/server/pto-service";

const mocks = vi.hoisted(() => ({
  findEffectiveEmployeeAssignment: vi.fn(),
  findEmployeeById: vi.fn(),
  findEmployeeByPlatformUserId: vi.fn(),
  findPlatformUserById: vi.fn(),
  findPtoBalance: vi.fn(),
  getGlobalPtoSettings: vi.fn(),
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
  decidePtoRequest: vi.fn(),
  findPtoBalance: mocks.findPtoBalance,
  findPtoRequestById: vi.fn(),
  getGlobalPtoSettings: mocks.getGlobalPtoSettings,
  getPtoRequestWarnings: vi.fn(),
  getPtoSupportingCollections: vi.fn(),
  listActiveAdministratorOptions: vi.fn(),
  listActivePtoApproverOptions: vi.fn(),
  listPendingPtoApprovals: vi.fn(),
  listPtoBalanceLedger: vi.fn(),
  listPtoRequestsForRequester: vi.fn(),
  reassignPtoRequestApprover: vi.fn(),
  setGlobalPtoSettings: vi.fn(),
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

  it("routes a supervisor to the stable configured account", async () => {
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: { id: actorId, role: "supervisor" },
    });
    mocks.getGlobalPtoSettings.mockResolvedValue({
      supervisorApproverPlatformUserId: new ObjectId(approverId),
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

  it("requires an administrator to select another active administrator", async () => {
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: { id: actorId, role: "administrator" },
    });
    mocks.findPlatformUserById.mockResolvedValue({
      id: approverId,
      role: "administrator",
      status: "active",
    });

    await submitOwnPtoDraft({
      requestId,
      selectedAdministratorId: approverId,
    });

    expect(mocks.submitPtoDraft).toHaveBeenCalledWith({
      actorPlatformUserId: actorId,
      approverPlatformUserId: approverId,
      requestId,
    });
  });
});
