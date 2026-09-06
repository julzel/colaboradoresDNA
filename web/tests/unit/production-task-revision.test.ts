import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";

import type {
  ProductionTaskDocument,
  ProductionWeekPlanDocument,
} from "@/features/production-tasks/domain/production-task";
import { compareProductionPlanRevisions } from "@/features/production-tasks/domain/production-task-revision";

const actorId = new ObjectId();
const areaId = new ObjectId();
const employeeA = new ObjectId();
const employeeB = new ObjectId();

function task(overrides: Partial<ProductionTaskDocument> = {}): ProductionTaskDocument {
  return {
    areaId,
    areaLabelSnapshot: "Cocina",
    assigneeEmployeeIds: [employeeA],
    completedAt: null,
    completedByEmployeeId: null,
    description: "Preparar mezcla",
    id: new ObjectId("507f1f77bcf86cd799439020"),
    sortOrder: 0,
    source: null,
    status: "pending",
    subject: "Producto A",
    version: 1,
    workDate: "2026-09-01",
    ...overrides,
  };
}

function plan(
  revision: number,
  tasks: ProductionTaskDocument[],
): ProductionWeekPlanDocument {
  return {
    _id: new ObjectId(),
    copiedFromPlanId: null,
    createdAt: new Date(),
    createdByPlatformUserId: actorId,
    currentSlot: revision === 2 ? "draft" : null,
    publishedAt: null,
    publishedByPlatformUserId: null,
    revision,
    status: revision === 2 ? "draft" : "superseded",
    tasks,
    timezone: "America/Costa_Rica",
    updatedAt: new Date(),
    updatedByPlatformUserId: actorId,
    version: 1,
    weekEnd: "2026-09-06",
    weekStart: "2026-08-31",
  };
}

describe("production plan revision comparison", () => {
  it("classifies reassignment, rescheduling, and content changes deterministically", () => {
    const prior = task();
    const current = task({
      assigneeEmployeeIds: [employeeB],
      description: "Preparar mezcla corregida",
      workDate: "2026-09-02",
    });

    expect(
      compareProductionPlanRevisions(plan(1, [prior]), plan(2, [current])),
    ).toEqual([
      expect.objectContaining({ type: "reassigned" }),
      expect.objectContaining({ type: "rescheduled" }),
      expect.objectContaining({ type: "edited" }),
    ]);
  });

  it("reports additions and removals without task content in affected identities", () => {
    const prior = task();
    const added = task({ id: new ObjectId("507f1f77bcf86cd799439021") });
    const changes = compareProductionPlanRevisions(plan(1, [prior]), plan(2, [added]));

    expect(changes.map((change) => change.type)).toEqual(["added", "removed"]);
    expect(changes.every((change) => change.affectedEmployeeIds.length === 1)).toBe(
      true,
    );
  });
});
