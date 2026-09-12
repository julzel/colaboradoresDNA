import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  canManageProductionTasks,
  requireProductionTaskManager,
} from "@/features/production-tasks/server/production-task-authorization";
const mocks = vi.hoisted(() => ({
  isProductionEmployee: vi.fn(),
  requirePlatformUser: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/features/auth/server/require-platform-user", () => ({
  requirePlatformUser: mocks.requirePlatformUser,
}));
vi.mock("@/features/employees/integrations/production-task-employee-adapter", () => ({
  productionTaskEmployeeAdapter: { isProductionEmployee: mocks.isProductionEmployee },
}));
describe("task management permissions", () => {
  beforeEach(() => vi.resetAllMocks());
  it("allows admins without an employee or department", async () => {
    expect(await canManageProductionTasks({ id: "admin", role: "administrator" })).toBe(
      true,
    );
    expect(mocks.isProductionEmployee).not.toHaveBeenCalled();
  });
  it.each([true, false])(
    "checks current Producción assignment for supervisors (%s)",
    async (assigned) => {
      mocks.isProductionEmployee.mockResolvedValue(assigned);
      expect(
        await canManageProductionTasks({ id: "supervisor", role: "supervisor" }),
      ).toBe(assigned);
      expect(mocks.isProductionEmployee).toHaveBeenCalledWith(
        "supervisor",
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      );
    },
  );
  it("denies collaborator mutations even when in Producción", async () => {
    mocks.isProductionEmployee.mockResolvedValue(true);
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: { id: "person", role: "collaborator" },
    });
    await expect(requireProductionTaskManager()).rejects.toMatchObject({
      code: "forbidden",
    });
    expect(mocks.isProductionEmployee).not.toHaveBeenCalled();
  });
});
