import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createEmployeeScheduleAsAdministrator,
  getEmployeeScheduleAsAdministrator,
  getEmployeeScheduleHistoryAsAdministrator,
  getOwnEmployeeSchedule,
  getSchedulerRosterAsAdministrator,
  listEmployeeSchedulesAsAdministrator,
  replaceEmployeeScheduleAsAdministrator,
  resolveEmployeeWorkRange,
  type EmployeeScheduleCommand,
} from "@/features/scheduling/server/scheduler-service";
import {
  SchedulingDomainError,
  type ScheduleV2,
  type ScheduleWeek,
} from "@/features/scheduling/domain/schedule";

const mocks = vi.hoisted(() => ({
  createSchedule: vi.fn(),
  findActiveEmployeeIdByPlatformUserId: vi.fn(),
  findEffectiveSchedule: vi.fn(),
  listScheduleHistory: vi.fn(),
  listActiveEmployees: vi.fn(),
  listSchedulesEffectiveOn: vi.fn(),
  listSchedulesOverlappingRange: vi.fn(),
  replaceSchedule: vi.fn(),
  requirePlatformUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/features/auth/server/require-platform-user", () => ({
  requirePlatformUser: mocks.requirePlatformUser,
}));

vi.mock("@/features/employees/integrations/scheduling-employee-adapter", () => ({
  schedulingEmployeeIntegration: {
    employeeIsActive: vi.fn(),
    findActiveEmployeeIdByPlatformUserId: mocks.findActiveEmployeeIdByPlatformUserId,
    listActiveEmployees: mocks.listActiveEmployees,
    recordScheduleAudit: vi.fn(),
  },
}));

vi.mock("@/features/scheduling/server/schedule-repository", () => ({
  createSchedule: mocks.createSchedule,
  findEffectiveSchedule: mocks.findEffectiveSchedule,
  listScheduleHistory: mocks.listScheduleHistory,
  listSchedulesEffectiveOn: mocks.listSchedulesEffectiveOn,
  listSchedulesOverlappingRange: mocks.listSchedulesOverlappingRange,
  replaceSchedule: mocks.replaceSchedule,
}));

const actorPlatformUserId = "507f1f77bcf86cd799439011";
const employeeId = "507f1f77bcf86cd799439012";

const week: ScheduleWeek = {
  shifts: [
    {
      dayOfWeek: "tuesday",
      endTime: "16:30",
      startTime: "07:30",
    },
    {
      dayOfWeek: "friday",
      endTime: "12:30",
      startTime: "07:30",
    },
  ],
};

const command: EmployeeScheduleCommand = {
  anchorDate: "2026-08-31",
  effectiveFrom: "2026-09-01",
  employeeId,
  weeks: [week],
};

function effectiveSchedule(): ScheduleV2 {
  return {
    anchorDate: "2026-08-31",
    effectiveFrom: "2026-09-01",
    effectiveTo: null,
    employeeId,
    id: "schedule-1",
    timezone: "America/Costa_Rica" as const,
    version: 2,
    weeks: [week],
  };
}

describe("scheduler service authorization and orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: {
        id: actorPlatformUserId,
        role: "administrator",
      },
    });
    mocks.createSchedule.mockResolvedValue(effectiveSchedule());
    mocks.replaceSchedule.mockResolvedValue(effectiveSchedule());
    mocks.findEffectiveSchedule.mockResolvedValue(effectiveSchedule());
    mocks.listScheduleHistory.mockResolvedValue([effectiveSchedule()]);
    mocks.listSchedulesEffectiveOn.mockResolvedValue([effectiveSchedule()]);
    mocks.listActiveEmployees.mockResolvedValue([
      { displayName: "Ana Mora", id: employeeId },
      { displayName: "Luis Solano", id: "507f1f77bcf86cd799439099" },
    ]);
    mocks.listSchedulesOverlappingRange.mockResolvedValue([effectiveSchedule()]);
  });

  it("binds schedule creation to the authenticated administrator", async () => {
    await createEmployeeScheduleAsAdministrator(command);

    expect(mocks.requirePlatformUser).toHaveBeenCalledWith({
      roles: ["administrator"],
    });
    expect(mocks.createSchedule).toHaveBeenCalledWith({
      anchorDate: "2026-08-31",
      createdByPlatformUserId: actorPlatformUserId,
      effectiveFrom: "2026-09-01",
      effectiveTo: null,
      employeeId,
      timezone: "America/Costa_Rica",
      version: 2,
      weeks: [week],
    });
  });

  it("binds schedule replacement to the authenticated administrator", async () => {
    await replaceEmployeeScheduleAsAdministrator(command);

    expect(mocks.requirePlatformUser).toHaveBeenCalledWith({
      roles: ["administrator"],
    });
    expect(mocks.replaceSchedule).toHaveBeenCalledWith({
      anchorDate: "2026-08-31",
      createdByPlatformUserId: actorPlatformUserId,
      effectiveFrom: "2026-09-01",
      effectiveTo: null,
      employeeId,
      timezone: "America/Costa_Rica",
      version: 2,
      weeks: [week],
    });
  });

  it("authorizes administrator reads before loading one employee's schedule", async () => {
    await getEmployeeScheduleAsAdministrator({
      employeeId,
      onDate: "2026-09-01",
    });

    expect(mocks.requirePlatformUser).toHaveBeenCalledWith({
      roles: ["administrator"],
    });
    expect(mocks.findEffectiveSchedule).toHaveBeenCalledWith({
      employeeId,
      onDate: "2026-09-01",
    });
  });

  it("authorizes administrator history and scheduler-list reads", async () => {
    await getEmployeeScheduleHistoryAsAdministrator(employeeId);
    await listEmployeeSchedulesAsAdministrator("2026-09-01");

    expect(mocks.requirePlatformUser).toHaveBeenNthCalledWith(1, {
      roles: ["administrator"],
    });
    expect(mocks.requirePlatformUser).toHaveBeenNthCalledWith(2, {
      roles: ["administrator"],
    });
    expect(mocks.listScheduleHistory).toHaveBeenCalledWith(employeeId);
    expect(mocks.listSchedulesEffectiveOn).toHaveBeenCalledWith("2026-09-01");
  });

  it("builds a scheduler roster that keeps collaborators without a schedule visible", async () => {
    await expect(getSchedulerRosterAsAdministrator("2026-09-01")).resolves.toEqual([
      {
        displayName: "Ana Mora",
        id: employeeId,
        schedule: effectiveSchedule(),
      },
      {
        displayName: "Luis Solano",
        id: "507f1f77bcf86cd799439099",
        schedule: null,
      },
    ]);

    expect(mocks.requirePlatformUser).toHaveBeenCalledWith({
      roles: ["administrator"],
    });
    expect(mocks.listActiveEmployees).toHaveBeenCalledWith();
    expect(mocks.listSchedulesEffectiveOn).toHaveBeenCalledWith("2026-09-01");
  });

  it("does not reach a repository when administrator authorization fails", async () => {
    const denied = new Error("forbidden");
    mocks.requirePlatformUser.mockRejectedValue(denied);

    await expect(createEmployeeScheduleAsAdministrator(command)).rejects.toBe(denied);
    await expect(
      getEmployeeScheduleAsAdministrator({
        employeeId,
        onDate: "2026-09-01",
      }),
    ).rejects.toBe(denied);

    expect(mocks.createSchedule).not.toHaveBeenCalled();
    expect(mocks.findEffectiveSchedule).not.toHaveBeenCalled();
  });
});

describe("scheduler self-service and internal range API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePlatformUser.mockResolvedValue({
      platformUser: {
        id: actorPlatformUserId,
        role: "collaborator",
      },
    });
    mocks.findActiveEmployeeIdByPlatformUserId.mockResolvedValue(employeeId);
    mocks.findEffectiveSchedule.mockResolvedValue(effectiveSchedule());
    mocks.listSchedulesOverlappingRange.mockResolvedValue([effectiveSchedule()]);
  });

  it("derives the collaborator schedule target from the authenticated identity", async () => {
    await expect(getOwnEmployeeSchedule("2026-09-01")).resolves.toEqual(
      effectiveSchedule(),
    );

    expect(mocks.requirePlatformUser).toHaveBeenCalledWith();
    expect(mocks.findActiveEmployeeIdByPlatformUserId).toHaveBeenCalledWith(
      actorPlatformUserId,
    );
    expect(mocks.findEffectiveSchedule).toHaveBeenCalledWith({
      employeeId,
      onDate: "2026-09-01",
    });
  });

  it("returns no self-service schedule when the account has no active employee", async () => {
    mocks.findActiveEmployeeIdByPlatformUserId.mockResolvedValue(null);

    await expect(getOwnEmployeeSchedule("2026-09-01")).resolves.toBeNull();
    expect(mocks.findEffectiveSchedule).not.toHaveBeenCalled();
  });

  it("delegates the range query and calculates working dates and minutes", async () => {
    await expect(
      resolveEmployeeWorkRange({
        employeeId,
        endDate: "2026-09-04",
        startDate: "2026-09-01",
      }),
    ).resolves.toMatchObject({
      endDate: "2026-09-04",
      sourceScheduleIds: ["schedule-1"],
      startDate: "2026-09-01",
      totalScheduledMinutes: 840,
      workingDates: ["2026-09-01", "2026-09-04"],
      workingDayCount: 2,
    });

    expect(mocks.listSchedulesOverlappingRange).toHaveBeenCalledWith({
      employeeId,
      endDate: "2026-09-04",
      startDate: "2026-09-01",
    });
    expect(mocks.requirePlatformUser).not.toHaveBeenCalled();
  });

  it("fails closed when the repository finds no effective schedule coverage", async () => {
    mocks.listSchedulesOverlappingRange.mockResolvedValue([]);

    await expect(
      resolveEmployeeWorkRange({
        employeeId,
        endDate: "2026-09-04",
        startDate: "2026-09-01",
      }),
    ).rejects.toMatchObject({
      code: "coverage_gap",
      details: {
        date: "2026-09-01",
        endDate: "2026-09-04",
        sourceScheduleIds: [],
        startDate: "2026-09-01",
      },
    } satisfies Partial<SchedulingDomainError>);
  });
});
