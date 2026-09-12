// @vitest-environment node
import { randomUUID } from "node:crypto";
import { ObjectId, type Db } from "mongodb";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { getDatabase, getMongoClient } from "@/lib/server/mongodb";
import { commitTaskEdit } from "@/features/production-tasks/server/production-task-edit-repository";
import {
  createEmptyWeekDraft,
  type ProductionWeekPlanDocument,
} from "@/features/production-tasks/domain/production-task";
import {
  getCostaRicaDate,
  getMondayForDate,
  addCalendarDays,
} from "@/features/production-tasks/domain/shared";
import type { TaskEditCommand } from "@/features/production-tasks/domain/production-task-edit";
vi.mock("server-only", () => ({}));
const databaseName = `dna_taskedit_${randomUUID().replaceAll("-", "").slice(0, 24)}`;
const actor = new ObjectId().toHexString(),
  area = new ObjectId().toHexString(),
  person = new ObjectId().toHexString();
const date = addCalendarDays(getCostaRicaDate(), 7);
const input = {
  areaId: area,
  areaLabelSnapshot: "Cocina",
  assigneeEmployeeIds: [person],
  description: "Preparar",
  subject: null,
  sortOrder: 0,
  workDate: date,
};
let db: Db;
let created = false;
describe.skipIf(process.env.RUN_TASK_EDIT_LIVE !== "1")(
  "task edits in an isolated MongoDB database",
  () => {
    beforeAll(async () => {
      vi.stubEnv("MONGODB_DB", databaseName);
      db = await getDatabase();
      if ((await db.listCollections().toArray()).length)
        throw new Error("Refusing to reuse database");
      created = true;
      await db.collection("production_areas").insertOne({ status: "active" });
      await db.collection("production_week_plans").createIndex(
        { weekStart: 1, currentSlot: 1 },
        {
          unique: true,
          partialFilterExpression: { currentSlot: { $type: "string" } },
        },
      );
    }, 60000);
    afterAll(async () => {
      if (
        created &&
        db.databaseName === databaseName &&
        /^dna_taskedit_[a-f0-9]{24}$/.test(databaseName)
      )
        await db.dropDatabase();
      await (await getMongoClient()).close();
      vi.unstubAllEnvs();
    });
    it("creates, revises, moves across weeks, and removes the final task with history and audit", async () => {
      const createdTask = await commitTaskEdit(
        {
          action: "create",
          expectedTargetPlanId: null,
          task: input,
          acknowledgeWarnings: false,
        },
        actor,
        input,
      );
      const updated = await commitTaskEdit(
        {
          action: "update",
          source: {
            planId: createdTask.planIds[0]!,
            taskId: createdTask.taskId,
            expectedTaskVersion: 1,
          },
          expectedTargetPlanId: createdTask.planIds[0]!,
          task: { ...input, description: "Empacar" },
          acknowledgeWarnings: false,
        },
        actor,
        { ...input, description: "Empacar" },
      );
      const targetDate = addCalendarDays(date, 7);
      const moved = await commitTaskEdit(
        {
          action: "update",
          source: {
            planId: updated.planIds[0]!,
            taskId: createdTask.taskId,
            expectedTaskVersion: 2,
          },
          expectedTargetPlanId: null,
          task: { ...input, workDate: targetDate },
          acknowledgeWarnings: false,
        },
        actor,
        { ...input, workDate: targetDate },
      );
      expect(moved.planIds).toHaveLength(2);
      const collection = db.collection<ProductionWeekPlanDocument>(
        "production_week_plans",
      );
      const target = await collection.findOne({
        weekStart: getMondayForDate(targetDate),
        currentSlot: "published",
      });
      expect(target?.tasks[0]?.id.toHexString()).toBe(createdTask.taskId);
      expect(
        (
          await collection.findOne({
            weekStart: getMondayForDate(date),
            currentSlot: "published",
          })
        )?.tasks,
      ).toEqual([]);
      await commitTaskEdit(
        {
          action: "remove",
          source: {
            planId: target!._id.toHexString(),
            taskId: createdTask.taskId,
            expectedTaskVersion: 3,
          },
        },
        actor,
      );
      expect(
        (
          await collection.findOne({
            weekStart: getMondayForDate(targetDate),
            currentSlot: "published",
          })
        )?.tasks,
      ).toEqual([]);
      expect(await collection.countDocuments({ status: "superseded" })).toBe(3);
      expect(
        await db
          .collection("production_task_audit")
          .countDocuments({ actorPlatformUserId: new ObjectId(actor) }),
      ).toBe(5);
      expect(
        await db.collection("production_task_assignment_changes").countDocuments(),
      ).toBeGreaterThan(0);
    });
    it("rejects stale destinations and allows only one concurrent creation of an empty week", async () => {
      const workDate = addCalendarDays(date, 28);
      const prepared = { ...input, workDate };
      const command: TaskEditCommand = {
        action: "create",
        expectedTargetPlanId: null,
        task: prepared,
        acknowledgeWarnings: false,
      };
      const results = await Promise.allSettled([
        commitTaskEdit(command, actor, prepared),
        commitTaskEdit(command, actor, prepared),
      ]);
      expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
      expect(
        await db
          .collection("production_week_plans")
          .countDocuments({ weekStart: getMondayForDate(workDate) }),
      ).toBe(1);
    });
    it("blocks past dates and pending drafts without writing", async () => {
      await expect(
        commitTaskEdit(
          {
            action: "create",
            expectedTargetPlanId: null,
            task: { ...input, workDate: "2000-01-01" },
            acknowledgeWarnings: true,
          },
          actor,
          { ...input, workDate: "2000-01-01" },
        ),
      ).rejects.toMatchObject({ code: "task_date_past" });
      const workDate = addCalendarDays(date, 42);
      await db.collection("production_week_plans").insertOne(
        createEmptyWeekDraft({
          actorPlatformUserId: actor,
          revision: 1,
          weekStart: getMondayForDate(workDate),
        }),
      );
      await expect(
        commitTaskEdit(
          {
            action: "create",
            expectedTargetPlanId: null,
            task: { ...input, workDate },
            acknowledgeWarnings: true,
          },
          actor,
          { ...input, workDate },
        ),
      ).rejects.toMatchObject({ code: "pending_draft" });
      expect(
        await db.collection("production_week_plans").countDocuments({
          weekStart: getMondayForDate(workDate),
          currentSlot: "published",
        }),
      ).toBe(0);
    });
  },
);
