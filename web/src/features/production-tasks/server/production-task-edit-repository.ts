import "server-only";
import { MongoServerError, ObjectId } from "mongodb";
import { getDatabase, getMongoClient } from "@/lib/server/mongodb";
import {
  createEmptyWeekDraft,
  type ProductionTaskDocument,
  type ProductionWeekPlanDocument,
  type ProductionTaskAssignmentChangeDocument,
} from "../domain/production-task";
import {
  type TaskEditCommand,
  requireEditableTaskDate,
} from "../domain/production-task-edit";
import {
  getCostaRicaDate,
  getMondayForDate,
  ProductionTaskDomainError,
} from "../domain/shared";
import { compareProductionPlanRevisions } from "../domain/production-task-revision";
import { recordProductionTaskAudit } from "./production-task-audit-repository";
import { ensureProductionTaskIndexes } from "./production-task-indexes";
import { lockProductionWeeks } from "./production-task-week-lock";
import type { PreparedProductionTaskInput } from "./production-task-repository";
import type { ProductionTaskEditResult } from "../application/production-task-contracts";

/** Publish a new revision of every affected week in a single transaction. */
export async function commitTaskEdit(
  command: TaskEditCommand,
  actorId: string,
  prepared?: PreparedProductionTaskInput,
): Promise<ProductionTaskEditResult> {
  await ensureProductionTaskIndexes();
  const database = await getDatabase();
  const client = await getMongoClient();
  try {
    return await client.withSession(async (session) => {
      const result = await session.withTransaction(async () => {
        const plans = database.collection<ProductionWeekPlanDocument>(
          "production_week_plans",
        );
        const today = getCostaRicaDate();
        let sourcePlan: ProductionWeekPlanDocument | null = null;
        let sourceTask: ProductionTaskDocument | undefined;
        if (command.action !== "create") {
          sourcePlan = await plans.findOne(
            { _id: new ObjectId(command.source.planId), currentSlot: "published" },
            { session },
          );
          sourceTask = sourcePlan?.tasks.find(
            (task) => task.id.toHexString() === command.source.taskId,
          );
          if (
            !sourcePlan ||
            !sourceTask ||
            sourceTask.version !== command.source.expectedTaskVersion
          )
            throw new ProductionTaskDomainError("stale_version");
          requireEditableTaskDate(sourceTask.workDate, today);
        }
        const date =
          command.action === "remove" ? sourceTask!.workDate : command.task.workDate;
        requireEditableTaskDate(date, today);
        const targetWeek = getMondayForDate(date);
        await lockProductionWeeks(database, session, [
          targetWeek,
          ...(sourcePlan ? [sourcePlan.weekStart] : []),
        ]);
        const target = await plans.findOne(
          { weekStart: targetWeek, currentSlot: "published" },
          { session },
        );
        if (
          command.action !== "remove" &&
          (target?._id.toHexString() ?? null) !== command.expectedTargetPlanId
        )
          throw new ProductionTaskDomainError("stale_version");
        const weeks = [
          ...new Set([targetWeek, ...(sourcePlan ? [sourcePlan.weekStart] : [])]),
        ].sort();
        if (
          await plans.findOne(
            { weekStart: { $in: weeks }, currentSlot: "draft" },
            { session },
          )
        )
          throw new ProductionTaskDomainError("pending_draft");
        const taskId = sourceTask?.id ?? new ObjectId();
        const revisions: string[] = [];
        for (const weekStart of weeks) {
          const previous = weekStart === targetWeek ? target : sourcePlan;
          const latest = await plans.findOne(
            { weekStart },
            { session, sort: { revision: -1 } },
          );
          const revision = createEmptyWeekDraft({
            actorPlatformUserId: actorId,
            revision: (latest?.revision ?? 0) + 1,
            weekStart,
          });
          revision.tasks = (previous?.tasks ?? []).filter(
            (task) => !task.id.equals(taskId),
          );
          if (weekStart === targetWeek && command.action !== "remove") {
            if (!prepared) throw new ProductionTaskDomainError("publication_invalid");
            const task: ProductionTaskDocument = {
              id: taskId,
              workDate: prepared.workDate,
              areaId: new ObjectId(prepared.areaId),
              areaLabelSnapshot: prepared.areaLabelSnapshot,
              assigneeEmployeeIds: prepared.assigneeEmployeeIds.map(
                (id) => new ObjectId(id),
              ),
              description: prepared.description,
              subject: prepared.subject,
              sortOrder:
                sourcePlan?.weekStart === weekStart
                  ? sourceTask!.sortOrder
                  : Math.max(-1, ...revision.tasks.map((item) => item.sortOrder)) + 1,
              status: sourceTask?.status ?? "pending",
              completedAt: sourceTask?.completedAt ?? null,
              completedByEmployeeId: sourceTask?.completedByEmployeeId ?? null,
              source: sourceTask?.source ?? null,
              version: (sourceTask?.version ?? 0) + 1,
            };
            revision.tasks.push(task);
          }
          if (revision.tasks.length > 500)
            throw new ProductionTaskDomainError("task_limit");
          const now = new Date();
          revision.currentSlot = "published";
          revision.status = "published";
          revision.publishedAt = now;
          revision.publishedByPlatformUserId = new ObjectId(actorId);
          if (previous) {
            const updated = await plans.updateOne(
              {
                _id: previous._id,
                version: previous.version,
                currentSlot: "published",
              },
              {
                $set: {
                  currentSlot: null,
                  status: "superseded",
                  updatedAt: now,
                  updatedByPlatformUserId: new ObjectId(actorId),
                },
                $inc: { version: 1 },
              },
              { session },
            );
            if (!updated.modifiedCount)
              throw new ProductionTaskDomainError("stale_version");
          }
          await plans.insertOne(revision, { session });
          const changes = compareProductionPlanRevisions(previous, revision).flatMap(
            (change) =>
              change.affectedEmployeeIds.map(
                (employeeId): ProductionTaskAssignmentChangeDocument => ({
                  _id: new ObjectId(),
                  changeType: change.type,
                  createdAt: now,
                  employeeId: new ObjectId(employeeId),
                  planId: revision._id,
                  readAt: null,
                  revision: revision.revision,
                  taskId: new ObjectId(change.taskId),
                  weekStart,
                }),
              ),
          );
          if (changes.length)
            await database
              .collection<ProductionTaskAssignmentChangeDocument>(
                "production_task_assignment_changes",
              )
              .insertMany(changes, { session });
          await recordProductionTaskAudit({
            action: "plan_updated",
            actorPlatformUserId: actorId,
            changedFields: ["tasks", command.action],
            session,
            targetPlanId: revision._id.toHexString(),
            targetTaskId: taskId.toHexString(),
          });
          revisions.push(revision._id.toHexString());
        }
        return { taskId: taskId.toHexString(), date, planIds: revisions };
      });
      if (!result) throw new ProductionTaskDomainError("stale_version");
      return result;
    });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000)
      throw new ProductionTaskDomainError("stale_version");
    throw error;
  }
}
