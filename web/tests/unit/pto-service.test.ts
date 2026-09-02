import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createEmployeePtoDraftAsAdministrator,
  createOwnPtoDraft,
  decideAssignedPtoRequest,
  getPtoAdministrationDashboard,
  getPtoDashboard,
  getPtoRequestDetail,
  submitOwnPtoDraft,
  updateOwnPtoDraft,
} from "@/features/pto/server/pto-service";
import { PtoScheduleCalculationError } from "@/features/pto/integrations/pto-scheduling-port";

const mocks = vi.hoisted(() => ({
  calculateFullDayLeave: vi.fn(),
  findEffectiveEmployeeAssignment: vi.fn(),
  findEmployeeById: vi.fn(),
  findEmployeeByPlatformUserId: vi.fn(),
  findPlatformUserById: vi.fn(),
  findPtoBalance: vi.fn(),
  findPtoRequestById: vi.fn(),
  getPtoRequestWarnings: vi.fn(),
  createPtoDraft: vi.fn(),
  decidePtoRequest: vi.fn(),
  listPendingPtoApprovals: vi.fn(),
  listPtoRequestsForAdministration: vi.fn(),
  listUpcomingApprovedProxyPtoRequests: vi.fn(),
  requirePlatformUser: vi.fn(),
  submitPtoDraft: vi.fn(),
  updatePtoDraft: vi.fn(),
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

vi.mock("@/features/scheduling/integrations/pto-scheduling-adapter", () => ({
  ptoSchedulingIntegration: {
    calculateFullDayLeave: mocks.calculateFullDayLeave,
  },
}));

vi.mock("@/features/pto/server/pto-repository", () => ({
  adjustPtoBalance: vi.fn(),
  cancelPtoRequest: vi.fn(),
  createOpeningPtoBalance: vi.fn(),
  createPtoDraft: mocks.createPtoDraft,
  decidePtoRequest: mocks.decidePtoRequest,
  findPtoBalance: mocks.findPtoBalance,
  findPtoRequestById: mocks.findPtoRequestById,
  getPtoRequestWarnings: mocks.getPtoRequestWarnings,
  getPtoSupportingCollections: vi.fn(),
  listPendingPtoApprovals: mocks.listPendingPtoApprovals,
  listPtoBalanceLedger: vi.fn(),
  listPtoRequestsForAdministration: mocks.listPtoRequestsForAdministration,
  listPtoRequestsForRequester: vi.fn(),
  listUpcomingApprovedProxyPtoRequests: mocks.listUpcomingApprovedProxyPtoRequests,
  reassignPtoRequestApprover: vi.fn(),
  submitPtoDraft: mocks.submitPtoDraft,
  updatePtoDraft: mocks.updatePtoDraft,
}));

const actorId = "507f1f77bcf86cd799439011";
const employeeId = "507f1f77bcf86cd799439012";
const approverId = "507f1f77bcf86cd799439013";
const managerEmployeeId = "507f1f77bcf86cd799439014";
const requestId = "507f1f77bcf86cd799439015";
const scheduleId = "507f1f77bcf86cd799439016";
const requestUpdatedAt = new Date("2026-08-09T12:00:00.000Z");

const defaultScheduleCalculation = {
  sourceScheduleIds: [scheduleId],
  totalScheduledMinutes: 480,
  workingDates: ["2026-08-10"],
};

function expectedSubmittedDuration({
  calculation = defaultScheduleCalculation,
  units = calculation.workingDates.length * 2,
}: {
  calculation?: typeof defaultScheduleCalculation;
  units?: number;
} = {}) {
  return {
    calculation: {
      ...calculation,
      calculatedAt: expect.any(Date),
      calculationPolicyVersion: 1,
    },
    units,
  };
}

describe("PTO submission routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calculateFullDayLeave.mockResolvedValue(defaultScheduleCalculation);
    mocks.findEmployeeByPlatformUserId.mockResolvedValue({
      employmentStatus: "active",
      id: employeeId,
    });
    mocks.findPtoBalance.mockResolvedValue({ currentBalanceUnits: 10 });
    mocks.findPtoRequestById.mockResolvedValue({
      category: "vacation",
      collaboratorNote: null,
      createdByPlatformUserId: actorId,
      durationCalculation: null,
      durationUnits: 2,
      endDate: "2026-08-10",
      requesterEmployeeId: employeeId,
      requesterPlatformUserId: actorId,
      requestedPortion: "full",
      startDate: "2026-08-10",
      updatedAt: requestUpdatedAt,
    });
    mocks.getPtoRequestWarnings.mockResolvedValue({
      hasOverlap: false,
      projectedBalanceUnits: null,
      wouldBeNegative: false,
    });
    mocks.submitPtoDraft.mockResolvedValue({ id: requestId });
    mocks.listPendingPtoApprovals.mockResolvedValue([]);
    mocks.listPtoRequestsForAdministration.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("routes a collaborator only to the active assigned supervisor", async () => {
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: { id: actorId, role: "collaborator" },
    });
    mocks.findEffectiveEmployeeAssignment.mockResolvedValue({ managerEmployeeId });
    mocks.findEmployeeById.mockImplementation(async (id: string) =>
      id === employeeId
        ? { employmentStatus: "active", id: employeeId }
        : { employmentStatus: "active", platformUserId: approverId },
    );
    mocks.findPlatformUserById.mockImplementation(async (id: string) =>
      id === actorId
        ? { id: actorId, role: "collaborator", status: "active" }
        : { id: approverId, role: "supervisor", status: "active" },
    );

    await submitOwnPtoDraft({ requestId });

    expect(mocks.submitPtoDraft).toHaveBeenCalledWith({
      actorPlatformUserId: actorId,
      approverPlatformUserId: approverId,
      duration: expectedSubmittedDuration(),
      expectedUpdatedAt: requestUpdatedAt,
      requestId,
    });
  });

  it("allows an active administrator to be the collaborator's assigned manager", async () => {
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: { id: actorId, role: "collaborator" },
    });
    mocks.findEffectiveEmployeeAssignment.mockResolvedValue({ managerEmployeeId });
    mocks.findEmployeeById.mockImplementation(async (id: string) =>
      id === employeeId
        ? { employmentStatus: "active", id: employeeId }
        : { employmentStatus: "active", platformUserId: approverId },
    );
    mocks.findPlatformUserById.mockImplementation(async (id: string) =>
      id === actorId
        ? { id: actorId, role: "collaborator", status: "active" }
        : { id: approverId, role: "administrator", status: "active" },
    );

    await submitOwnPtoDraft({ requestId });

    expect(mocks.submitPtoDraft).toHaveBeenCalledWith({
      actorPlatformUserId: actorId,
      approverPlatformUserId: approverId,
      duration: expectedSubmittedDuration(),
      expectedUpdatedAt: requestUpdatedAt,
      requestId,
    });
  });

  it("routes a supervisor to the shared administrator pool", async () => {
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: { id: actorId, role: "supervisor" },
    });
    mocks.findEmployeeById.mockResolvedValue({
      employmentStatus: "active",
      id: employeeId,
    });
    mocks.findPlatformUserById.mockResolvedValue({
      id: actorId,
      role: "supervisor",
      status: "active",
    });
    await submitOwnPtoDraft({ requestId });

    expect(mocks.submitPtoDraft).toHaveBeenCalledWith({
      actorPlatformUserId: actorId,
      approverPlatformUserId: null,
      duration: expectedSubmittedDuration(),
      expectedUpdatedAt: requestUpdatedAt,
      requestId,
    });
  });

  it("submits a non-vacation request without an initialized balance", async () => {
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: { id: actorId, role: "supervisor" },
    });
    mocks.findPtoRequestById.mockResolvedValue({
      category: "incapacity",
      collaboratorNote: null,
      createdByPlatformUserId: actorId,
      durationCalculation: null,
      durationUnits: 2,
      endDate: "2026-08-10",
      requesterEmployeeId: employeeId,
      requesterPlatformUserId: actorId,
      requestedPortion: "full",
      startDate: "2026-08-10",
      updatedAt: requestUpdatedAt,
    });
    mocks.findEmployeeById.mockResolvedValue({
      employmentStatus: "active",
      id: employeeId,
    });
    mocks.findPlatformUserById.mockResolvedValue({
      id: actorId,
      role: "supervisor",
      status: "active",
    });

    await submitOwnPtoDraft({ requestId });

    expect(mocks.findPtoBalance).not.toHaveBeenCalled();
    expect(mocks.submitPtoDraft).toHaveBeenCalledWith({
      actorPlatformUserId: actorId,
      approverPlatformUserId: null,
      duration: expectedSubmittedDuration(),
      expectedUpdatedAt: requestUpdatedAt,
      requestId,
    });
  });

  it("requires an initialized balance before submitting vacation", async () => {
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: { id: actorId, role: "supervisor" },
    });
    mocks.findEmployeeById.mockResolvedValue({
      employmentStatus: "active",
      id: employeeId,
    });
    mocks.findPlatformUserById.mockResolvedValue({
      id: actorId,
      role: "supervisor",
      status: "active",
    });
    mocks.findPtoBalance.mockResolvedValue(null);

    await expect(submitOwnPtoDraft({ requestId })).rejects.toMatchObject({
      code: "balance_missing",
    });
    expect(mocks.submitPtoDraft).not.toHaveBeenCalled();
  });

  it("routes an administrator request to the shared administrator pool", async () => {
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: { id: actorId, role: "administrator" },
    });
    mocks.findEmployeeById.mockResolvedValue({
      employmentStatus: "active",
      id: employeeId,
    });
    mocks.findPlatformUserById.mockResolvedValue({
      id: actorId,
      role: "administrator",
      status: "active",
    });
    await submitOwnPtoDraft({ requestId });

    expect(mocks.submitPtoDraft).toHaveBeenCalledWith({
      actorPlatformUserId: actorId,
      approverPlatformUserId: null,
      duration: expectedSubmittedDuration(),
      expectedUpdatedAt: requestUpdatedAt,
      requestId,
    });
  });

  it("creates a request for an invited employee while recording the administrator as creator", async () => {
    const adminId = "507f1f77bcf86cd799439016";
    const input = {
      category: "vacation" as const,
      collaboratorNote: null,
      endDate: "2026-08-10",
      requestedPortion: "full" as const,
      startDate: "2026-08-10",
    };
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: { id: adminId, role: "administrator" },
    });
    mocks.findEmployeeById.mockResolvedValue({
      employmentStatus: "active",
      id: employeeId,
      platformUserId: actorId,
    });
    mocks.findPlatformUserById.mockResolvedValue({
      id: actorId,
      status: "invited",
    });
    mocks.createPtoDraft.mockResolvedValue({ id: requestId });

    await createEmployeePtoDraftAsAdministrator(employeeId, input);

    expect(mocks.createPtoDraft).toHaveBeenCalledWith({
      actorPlatformUserId: adminId,
      employeeId,
      request: {
        ...input,
        durationCalculation: {
          ...defaultScheduleCalculation,
          calculatedAt: expect.any(Date),
          calculationPolicyVersion: 1,
        },
        durationUnits: 2,
      },
      requesterPlatformUserId: actorId,
    });
  });

  it("derives one full leave unit pair per scheduled work date", async () => {
    const calculation = {
      ...defaultScheduleCalculation,
      totalScheduledMinutes: 960,
      workingDates: ["2026-08-10", "2026-08-12"],
    };
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: { id: actorId, role: "collaborator" },
    });
    mocks.calculateFullDayLeave.mockResolvedValue(calculation);
    mocks.createPtoDraft.mockResolvedValue({ id: requestId });

    await createOwnPtoDraft({
      category: "vacation",
      collaboratorNote: null,
      endDate: "2026-08-12",
      requestedPortion: "full",
      startDate: "2026-08-10",
    });

    expect(mocks.calculateFullDayLeave).toHaveBeenCalledWith({
      employeeId,
      endDate: "2026-08-12",
      startDate: "2026-08-10",
    });
    expect(mocks.createPtoDraft).toHaveBeenCalledWith({
      actorPlatformUserId: actorId,
      employeeId,
      request: {
        category: "vacation",
        collaboratorNote: null,
        durationCalculation: {
          ...calculation,
          calculatedAt: expect.any(Date),
          calculationPolicyVersion: 1,
        },
        durationUnits: 4,
        endDate: "2026-08-12",
        requestedPortion: "full",
        startDate: "2026-08-10",
      },
    });
  });

  it("counts a short scheduled shift as one full leave day", async () => {
    const calculation = {
      ...defaultScheduleCalculation,
      totalScheduledMinutes: 300,
    };
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: { id: actorId, role: "collaborator" },
    });
    mocks.calculateFullDayLeave.mockResolvedValue(calculation);

    await createOwnPtoDraft({
      category: "vacation",
      collaboratorNote: null,
      endDate: "2026-08-10",
      requestedPortion: "full",
      startDate: "2026-08-10",
    });

    expect(mocks.createPtoDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          durationCalculation: expect.objectContaining({
            totalScheduledMinutes: 300,
          }),
          durationUnits: 2,
        }),
      }),
    );
  });

  it("retains the supported half-day unit for a single scheduled date", async () => {
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: { id: actorId, role: "collaborator" },
    });

    await createOwnPtoDraft({
      category: "vacation",
      collaboratorNote: null,
      endDate: "2026-08-10",
      requestedPortion: "half",
      startDate: "2026-08-10",
    });

    expect(mocks.createPtoDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          durationUnits: 1,
          requestedPortion: "half",
        }),
      }),
    );
  });

  it("rejects a half-day intent spanning multiple scheduled work dates", async () => {
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: { id: actorId, role: "collaborator" },
    });
    mocks.calculateFullDayLeave.mockResolvedValue({
      ...defaultScheduleCalculation,
      totalScheduledMinutes: 960,
      workingDates: ["2026-08-10", "2026-08-11"],
    });

    await expect(
      createOwnPtoDraft({
        category: "vacation",
        collaboratorNote: null,
        endDate: "2026-08-11",
        requestedPortion: "half",
        startDate: "2026-08-10",
      }),
    ).rejects.toMatchObject({ code: "partial_day_range" });
    expect(mocks.createPtoDraft).not.toHaveBeenCalled();
  });

  it("recalculates duration when an own draft date range is updated", async () => {
    const calculation = {
      ...defaultScheduleCalculation,
      sourceScheduleIds: ["507f1f77bcf86cd799439017"],
      totalScheduledMinutes: 1_260,
      workingDates: ["2026-08-11", "2026-08-13", "2026-08-14"],
    };
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: { id: actorId, role: "collaborator" },
    });
    mocks.calculateFullDayLeave.mockResolvedValue(calculation);
    mocks.updatePtoDraft.mockResolvedValue({ id: requestId });

    await updateOwnPtoDraft(requestId, {
      category: "incapacity",
      collaboratorNote: "Reposo",
      endDate: "2026-08-15",
      requestedPortion: "full",
      startDate: "2026-08-11",
    });

    expect(mocks.calculateFullDayLeave).toHaveBeenCalledWith({
      employeeId,
      endDate: "2026-08-15",
      startDate: "2026-08-11",
    });
    expect(mocks.updatePtoDraft).toHaveBeenCalledWith({
      actorPlatformUserId: actorId,
      request: {
        category: "incapacity",
        collaboratorNote: "Reposo",
        durationCalculation: {
          ...calculation,
          calculatedAt: expect.any(Date),
          calculationPolicyVersion: 1,
        },
        durationUnits: 6,
        endDate: "2026-08-15",
        requestedPortion: "full",
        startDate: "2026-08-11",
      },
      requestId,
    });
  });

  it("maps incomplete scheduler coverage to a PTO domain error", async () => {
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: { id: actorId, role: "collaborator" },
    });
    mocks.calculateFullDayLeave.mockRejectedValue(
      new PtoScheduleCalculationError("schedule_incomplete"),
    );

    await expect(
      createOwnPtoDraft({
        category: "vacation",
        collaboratorNote: null,
        endDate: "2026-08-10",
        requestedPortion: "full",
        startDate: "2026-08-10",
      }),
    ).rejects.toMatchObject({ code: "schedule_incomplete" });
    expect(mocks.createPtoDraft).not.toHaveBeenCalled();
  });

  it("rejects a covered date range with no scheduled workdays", async () => {
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: { id: actorId, role: "collaborator" },
    });
    mocks.calculateFullDayLeave.mockResolvedValue({
      ...defaultScheduleCalculation,
      totalScheduledMinutes: 0,
      workingDates: [],
    });

    await expect(
      createOwnPtoDraft({
        category: "vacation",
        collaboratorNote: null,
        endDate: "2026-08-10",
        requestedPortion: "full",
        startDate: "2026-08-10",
      }),
    ).rejects.toMatchObject({ code: "no_scheduled_workdays" });
    expect(mocks.createPtoDraft).not.toHaveBeenCalled();
  });

  it("refreshes and freezes the schedule calculation when submitting a draft", async () => {
    const now = new Date("2026-09-02T15:30:00.000Z");
    const refreshedCalculation = {
      ...defaultScheduleCalculation,
      sourceScheduleIds: ["507f1f77bcf86cd799439017"],
      totalScheduledMinutes: 780,
      workingDates: ["2026-08-10", "2026-08-11"],
    };
    vi.useFakeTimers();
    vi.setSystemTime(now);
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: { id: actorId, role: "supervisor" },
    });
    mocks.findEmployeeById.mockResolvedValue({
      employmentStatus: "active",
      id: employeeId,
    });
    mocks.findPlatformUserById.mockResolvedValue({
      id: actorId,
      role: "supervisor",
      status: "active",
    });
    mocks.findPtoRequestById.mockResolvedValue({
      category: "vacation",
      collaboratorNote: null,
      createdByPlatformUserId: actorId,
      durationCalculation: {
        ...defaultScheduleCalculation,
        calculatedAt: new Date("2026-08-01T00:00:00.000Z"),
      },
      durationUnits: 2,
      endDate: "2026-08-11",
      requesterEmployeeId: employeeId,
      requesterPlatformUserId: actorId,
      requestedPortion: "full",
      startDate: "2026-08-10",
      updatedAt: requestUpdatedAt,
    });
    mocks.calculateFullDayLeave.mockResolvedValue(refreshedCalculation);

    await submitOwnPtoDraft({ requestId });

    expect(mocks.calculateFullDayLeave).toHaveBeenCalledWith({
      employeeId,
      endDate: "2026-08-11",
      startDate: "2026-08-10",
    });
    expect(mocks.submitPtoDraft).toHaveBeenCalledWith({
      actorPlatformUserId: actorId,
      approverPlatformUserId: null,
      duration: {
        calculation: {
          ...refreshedCalculation,
          calculatedAt: now,
          calculationPolicyVersion: 1,
        },
        units: 4,
      },
      expectedUpdatedAt: requestUpdatedAt,
      requestId,
    });
  });

  it("allows an administrator to submit an admin-created employee request", async () => {
    const adminId = "507f1f77bcf86cd799439016";
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: { id: adminId, role: "administrator" },
    });
    mocks.findPtoRequestById.mockResolvedValue({
      category: "vacation",
      collaboratorNote: null,
      createdByPlatformUserId: adminId,
      durationCalculation: null,
      durationUnits: 2,
      endDate: "2026-08-10",
      requesterEmployeeId: employeeId,
      requesterPlatformUserId: actorId,
      requestedPortion: "full",
      startDate: "2026-08-10",
      updatedAt: requestUpdatedAt,
    });
    mocks.findEmployeeById.mockImplementation(async (id: string) =>
      id === employeeId
        ? { employmentStatus: "active", id: employeeId }
        : { employmentStatus: "active", platformUserId: approverId },
    );
    mocks.findPlatformUserById.mockImplementation(async (id: string) =>
      id === actorId
        ? { id: actorId, role: "collaborator", status: "active" }
        : { id: approverId, role: "supervisor", status: "active" },
    );
    mocks.findEffectiveEmployeeAssignment.mockResolvedValue({ managerEmployeeId });

    await submitOwnPtoDraft({ requestId });

    expect(mocks.submitPtoDraft).toHaveBeenCalledWith({
      actorPlatformUserId: adminId,
      administratorOverride: true,
      approverPlatformUserId: approverId,
      duration: expectedSubmittedDuration(),
      expectedUpdatedAt: requestUpdatedAt,
      requestId,
    });
  });

  it("shows who created an employee request and lets an administrator manage its draft", async () => {
    const adminId = "507f1f77bcf86cd799439016";
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: { id: adminId, role: "administrator" },
    });
    mocks.findPtoRequestById.mockResolvedValue({
      assignedApproverPlatformUserId: null,
      category: "vacation",
      createdByPlatformUserId: adminId,
      id: requestId,
      requesterEmployeeId: employeeId,
      requesterPlatformUserId: actorId,
      status: "draft",
      statusHistory: [],
    });
    mocks.findEmployeeById.mockResolvedValue({
      firstSurname: "Mora",
      givenNames: "Ana",
      preferredName: null,
      secondSurname: null,
    });
    mocks.findPlatformUserById.mockImplementation(async (id: string) =>
      id === adminId ? { displayName: "María Administradora", id: adminId } : null,
    );

    const detail = await getPtoRequestDetail(requestId);

    expect(detail).toMatchObject({
      canEdit: true,
      canSubmit: true,
      proxyEmployeeId: employeeId,
      request: { createdByName: "María Administradora" },
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
