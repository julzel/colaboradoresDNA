import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProductionTaskDocument } from "@/features/production-tasks/domain/production-task";
import { ProductionTaskDomainError } from "@/features/production-tasks/domain/shared";
import {
  completeProductionTaskForCurrentUser,
  getPublishedProductionBoard,
} from "@/features/production-tasks/server/production-task-service";

const mocks = vi.hoisted(() => ({
  findActiveEmployeeByPlatformUserId: vi.fn(),
  findCurrentPublishedPlan: vi.fn(),
  findTaskInPublishedPlan: vi.fn(),
  listActiveEmployees: vi.fn(),
  listProductionAreas: vi.fn(),
  requirePlatformUser: vi.fn(),
  transitionProductionTask: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/features/auth/server/require-platform-user", () => ({
  requirePlatformUser: mocks.requirePlatformUser,
}));
vi.mock("@/features/employees/integrations/production-task-employee-adapter", () => ({
  productionTaskEmployeeAdapter: {
    findActiveEmployeeByPlatformUserId: mocks.findActiveEmployeeByPlatformUserId,
    listActiveEmployees: mocks.listActiveEmployees,
  },
}));
vi.mock(
  "@/features/production-tasks/integrations/production-task-availability-adapter",
  () => ({
    productionTaskAvailabilityAdapter: { check: vi.fn() },
  }),
);
vi.mock("@/features/production-tasks/server/production-task-repository", () => ({
  archiveProductionTaskTemplate: vi.fn(),
  archiveProductionArea: vi.fn(),
  createProductionArea: vi.fn(),
  createOrGetProductionWeekDraft: vi.fn(),
  createProductionTaskTemplate: vi.fn(),
  findCurrentPublishedPlan: mocks.findCurrentPublishedPlan,
  findProductionPlanById: vi.fn(),
  findTaskInPublishedPlan: mocks.findTaskInPublishedPlan,
  listProductionAreas: mocks.listProductionAreas,
  listProductionPlanRevisions: vi.fn(),
  listProductionPlans: vi.fn(),
  listProductionTaskTemplates: vi.fn(),
  listUnreadProductionAssignmentChanges: vi.fn(),
  markProductionAssignmentChangesRead: vi.fn(),
  publishProductionWeekDraft: vi.fn(),
  saveProductionWeekDraft: vi.fn(),
  transitionProductionTask: mocks.transitionProductionTask,
}));

const platformUserId = "507f1f77bcf86cd799439011";
const employeeId = "507f1f77bcf86cd799439012";
const otherEmployeeId = new ObjectId("507f1f77bcf86cd799439013");
const taskId = new ObjectId("507f1f77bcf86cd799439014");

function task(assignees: ObjectId[]): ProductionTaskDocument {
  return {
    areaId: new ObjectId("507f1f77bcf86cd799439015"),
    areaLabelSnapshot: "Cocina",
    assigneeEmployeeIds: assignees,
    completedAt: null,
    completedByEmployeeId: null,
    description: "Preparar mezcla",
    id: taskId,
    sortOrder: 0,
    source: null,
    status: "pending",
    subject: null,
    version: 1,
    workDate: "2026-09-03",
  };
}

describe("production task service authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: { id: platformUserId, role: "collaborator" },
    });
    mocks.findActiveEmployeeByPlatformUserId.mockResolvedValue({
      displayName: "Ana Mora",
      email: "ana@example.com",
      employeeCode: "DNA-0001",
      employeeId,
      platformRole: "collaborator",
      platformUserId,
    });
    mocks.listActiveEmployees.mockResolvedValue([]);
    mocks.listProductionAreas.mockResolvedValue([]);
  });

  it("does not allow an unassigned collaborator to complete a visible task", async () => {
    mocks.findTaskInPublishedPlan.mockResolvedValue({
      plan: {},
      task: task([otherEmployeeId]),
    });

    await expect(
      completeProductionTaskForCurrentUser({
        expectedVersion: 1,
        planId: "507f1f77bcf86cd799439019",
        taskId: taskId.toHexString(),
      }),
    ).rejects.toEqual(new ProductionTaskDomainError("forbidden"));
    expect(mocks.transitionProductionTask).not.toHaveBeenCalled();
  });

  it("derives the completion actor from the authenticated employee", async () => {
    mocks.findTaskInPublishedPlan.mockResolvedValue({
      plan: {},
      task: task([new ObjectId(employeeId)]),
    });
    mocks.transitionProductionTask.mockResolvedValue({});

    await completeProductionTaskForCurrentUser({
      expectedVersion: 1,
      planId: "507f1f77bcf86cd799439019",
      taskId: taskId.toHexString(),
    });

    expect(mocks.transitionProductionTask).toHaveBeenCalledWith(
      expect.objectContaining({
        actorEmployeeId: employeeId,
        actorPlatformUserId: platformUserId,
      }),
    );
  });

  it("uses only the current published plan for authenticated board reads", async () => {
    mocks.findCurrentPublishedPlan.mockResolvedValue(null);

    const board = await getPublishedProductionBoard({
      date: "2026-09-03",
      view: "day",
    });

    expect(mocks.findCurrentPublishedPlan).toHaveBeenCalledWith("2026-08-31");
    expect(board.plan).toBeNull();
  });
});
