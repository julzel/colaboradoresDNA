// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import { editProductionTask } from "@/features/production-tasks/server/production-task-edit-service";
import { ProductionTaskDomainError } from "@/features/production-tasks/domain/shared";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  production: vi.fn(),
  employees: vi.fn(),
  areas: vi.fn(),
  plan: vi.fn(),
  commit: vi.fn(),
  availability: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/features/auth/server/require-platform-user", () => ({
  requirePlatformUser: mocks.auth,
}));
vi.mock("@/features/employees/integrations/production-task-employee-adapter", () => ({
  productionTaskEmployeeAdapter: {
    isProductionEmployee: mocks.production,
    listActiveEmployees: mocks.employees,
  },
}));
vi.mock("@/features/production-tasks/server/production-task-repository", () => ({
  listProductionAreas: mocks.areas,
  findProductionPlanById: mocks.plan,
}));
vi.mock("@/features/production-tasks/server/production-task-edit-repository", () => ({
  commitTaskEdit: mocks.commit,
}));
vi.mock(
  "@/features/production-tasks/integrations/production-task-availability-adapter",
  () => ({ productionTaskAvailabilityAdapter: { check: mocks.availability } }),
);
const id = new ObjectId().toHexString();
const task = {
  areaId: id,
  assigneeEmployeeIds: [id],
  description: "Preparar alimento",
  subject: "Pollo",
  sortOrder: 0,
  workDate: "2026-09-12",
};
const source = { planId: id, taskId: id, expectedTaskVersion: 1 };
const command = { action: "create", task, expectedTargetPlanId: null };
describe("direct task edits", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-13T02:00:00Z")); // Still Sept 12 in Costa Rica.
    mocks.auth.mockResolvedValue({ platformUser: { id, role: "supervisor" } });
    mocks.production.mockResolvedValue(true);
    mocks.employees.mockResolvedValue([{ employeeId: id }]);
    mocks.areas.mockResolvedValue([{ _id: new ObjectId(id), name: "Cocina" }]);
    mocks.plan.mockResolvedValue({
      currentSlot: "published",
      tasks: [{ id: new ObjectId(id), version: 1, workDate: "2026-09-12" }],
    });
    mocks.availability.mockResolvedValue({
      hasApprovedLeave: false,
      scheduleStatus: "scheduled",
    });
    mocks.commit.mockResolvedValue({ taskId: id, date: task.workDate, planIds: [id] });
  });
  afterEach(() => vi.useRealTimers());
  it("allows today in Costa Rica and derives the actor from the session", async () => {
    await editProductionTask(command);
    expect(mocks.commit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "create" }),
      id,
      expect.objectContaining({ areaLabelSnapshot: "Cocina" }),
    );
  });
  it.each(["collaborator", "supervisor"])("rejects unauthorized %s", async (role) => {
    mocks.auth.mockResolvedValue({ platformUser: { id, role } });
    mocks.production.mockResolvedValue(false);
    await expect(editProductionTask(command)).rejects.toMatchObject({
      code: "forbidden",
    });
    expect(mocks.commit).not.toHaveBeenCalled();
  });
  it("does not require a production assignment for admins", async () => {
    mocks.auth.mockResolvedValue({ platformUser: { id, role: "administrator" } });
    await editProductionTask(command);
    expect(mocks.commit).toHaveBeenCalled();
  });
  it("rejects new tasks and destinations in the past", async () => {
    for (const action of ["create", "update"]) {
      await expect(
        editProductionTask({
          ...command,
          action,
          ...(action === "update" ? { source } : {}),
          task: { ...task, workDate: "2026-09-11" },
        }),
      ).rejects.toMatchObject({ code: "task_date_past" });
    }
    expect(mocks.commit).not.toHaveBeenCalled();
  });
  it("cannot move or remove a past task even with a future destination", async () => {
    mocks.plan.mockResolvedValue({
      currentSlot: "published",
      tasks: [{ id: new ObjectId(id), version: 1, workDate: "2026-09-11" }],
    });
    await expect(
      editProductionTask({ ...command, action: "update", source }),
    ).rejects.toMatchObject({ code: "task_date_past" });
    await expect(
      editProductionTask({ action: "remove", source }),
    ).rejects.toMatchObject({ code: "task_date_past" });
    expect(mocks.commit).not.toHaveBeenCalled();
  });
  it("rejects inactive employees, invalid areas, and impossible dates", async () => {
    await expect(
      editProductionTask({ ...command, task: { ...task, workDate: "2026-02-30" } }),
    ).rejects.toThrow();
    mocks.employees.mockResolvedValue([]);
    await expect(editProductionTask(command)).rejects.toMatchObject({
      code: "active_employee_required",
    });
    mocks.areas.mockResolvedValue([]);
    await expect(editProductionTask(command)).rejects.toMatchObject({
      code: "area_not_found",
    });
    expect(mocks.commit).not.toHaveBeenCalled();
  });
  it("returns specific availability warnings and requires acknowledgment", async () => {
    mocks.availability.mockResolvedValue({
      hasApprovedLeave: true,
      scheduleStatus: "not_scheduled",
    });
    await expect(editProductionTask(command)).rejects.toMatchObject({
      code: "warnings_unacknowledged",
      warnings: ["approved_leave", "not_scheduled"],
    });
    expect(mocks.commit).not.toHaveBeenCalled();
    await editProductionTask({ ...command, acknowledgeWarnings: true });
    expect(mocks.commit).toHaveBeenCalled();
  });
  it("does not interpret availability lookup failure as availability", async () => {
    mocks.availability.mockRejectedValue(new Error("timeout"));
    await expect(editProductionTask(command)).rejects.toMatchObject({
      warnings: ["availability_unknown"],
    });
  });
  it("rejects a superseded source and propagates concurrent-write conflicts", async () => {
    mocks.plan.mockResolvedValue(null);
    await expect(
      editProductionTask({ action: "remove", source }),
    ).rejects.toMatchObject({ code: "stale_version" });
    mocks.commit.mockRejectedValue(new ProductionTaskDomainError("stale_version"));
    await expect(editProductionTask(command)).rejects.toMatchObject({
      code: "stale_version",
    });
  });
});
