import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect, replaceSchedule, revalidatePath } = vi.hoisted(() => ({
  redirect: vi.fn(),
  replaceSchedule: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/features/scheduling/server/scheduler-service", () => ({
  replaceEmployeeScheduleAsAdministrator: replaceSchedule,
}));

import { saveEmployeeScheduleAction } from "@/features/scheduling/actions/scheduler-actions";
import { initialSchedulerActionState } from "@/features/scheduling/domain/scheduler-action-state";

describe("scheduler actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds a weekly v2 command and derives its Monday anchor", async () => {
    const data = new FormData();
    data.set("employeeId", "507f1f77bcf86cd799439011");
    data.set("effectiveFrom", "2026-09-02");
    data.set("cycle", "weekly");
    data.set("week0.tuesday.enabled", "on");
    data.set("week0.tuesday.startTime", "07:30");
    data.set("week0.tuesday.endTime", "16:30");

    await saveEmployeeScheduleAction(initialSchedulerActionState, data);

    expect(replaceSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        anchorDate: "2026-08-31",
        effectiveFrom: "2026-09-02",
        employeeId: "507f1f77bcf86cd799439011",
        weeks: [
          {
            shifts: [{ dayOfWeek: "tuesday", endTime: "16:30", startTime: "07:30" }],
          },
        ],
      }),
    );
    expect(redirect).toHaveBeenCalledWith(
      "/admin/horarios/507f1f77bcf86cd799439011?guardado=1",
    );
  });

  it("rejects an alternating anchor that is not a Monday", async () => {
    const data = new FormData();
    data.set("employeeId", "507f1f77bcf86cd799439011");
    data.set("effectiveFrom", "2026-09-02");
    data.set("cycle", "alternating");
    data.set("anchorDate", "2026-09-02");
    data.set("week0.tuesday.enabled", "on");
    data.set("week0.tuesday.startTime", "07:30");
    data.set("week0.tuesday.endTime", "16:30");

    const result = await saveEmployeeScheduleAction(initialSchedulerActionState, data);

    expect(result.status).toBe("error");
    expect(result.errors?.anchorDate).toBeDefined();
    expect(replaceSchedule).not.toHaveBeenCalled();
  });
});
