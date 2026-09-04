import "server-only";

import { MongoServerError, ObjectId, type Collection } from "mongodb";
import type { ProductionImportPreviewDocument } from "@/features/production-tasks/domain/production-task-import";

import {
  createEmptyWeekDraft,
  type ProductionAreaDocument,
  type ProductionAreaInput,
  type ProductionTaskAssignmentChangeDocument,
  type ProductionTaskDocument,
  type ProductionTaskDraftInput,
  type ProductionTaskImportSourceDocument,
  type ProductionTaskActivityDocument,
  type ProductionTaskTemplateDocument,
  type ProductionTaskTemplateInput,
  type ProductionWeekPlanDocument,
} from "@/features/production-tasks/domain/production-task";
import { compareProductionPlanRevisions } from "@/features/production-tasks/domain/production-task-revision";
import {
  ProductionTaskDomainError,
  normalizeProductionLookup,
  productionObjectIdSchema,
} from "@/features/production-tasks/domain/shared";
import { recordProductionTaskAudit } from "@/features/production-tasks/server/production-task-audit-repository";
import type { ProductionTaskAuditAction } from "@/features/production-tasks/server/production-task-audit-repository";
import { ensureProductionTaskIndexes } from "@/features/production-tasks/server/production-task-indexes";
import { getDatabase, getMongoClient } from "@/lib/server/mongodb";

export type PreparedProductionTaskInput = ProductionTaskDraftInput & {
  areaLabelSnapshot: string;
  source?: ProductionTaskImportSourceDocument | null;
};

async function getPlanCollection(): Promise<Collection<ProductionWeekPlanDocument>> {
  const database = await getDatabase();
  return database.collection<ProductionWeekPlanDocument>("production_week_plans");
}

function sameDefinition(
  task: ProductionTaskDocument,
  input: PreparedProductionTaskInput,
) {
  return (
    task.areaId.toHexString() === input.areaId &&
    task.workDate === input.workDate &&
    task.subject === input.subject &&
    task.description === input.description &&
    task.assigneeEmployeeIds.map(String).sort().join(",") ===
      [...input.assigneeEmployeeIds].sort().join(",")
  );
}

function prepareTaskDocument(
  input: PreparedProductionTaskInput,
  existingById: Map<string, ProductionTaskDocument>,
): ProductionTaskDocument {
  const existing = input.id ? existingById.get(input.id) : undefined;
  const preservesIdentity = existing && sameDefinition(existing, input);

  return {
    areaId: new ObjectId(input.areaId),
    areaLabelSnapshot: input.areaLabelSnapshot,
    assigneeEmployeeIds: input.assigneeEmployeeIds.map((id) => new ObjectId(id)),
    completedAt: preservesIdentity ? existing.completedAt : null,
    completedByEmployeeId: preservesIdentity ? existing.completedByEmployeeId : null,
    description: input.description,
    id: existing?.id ?? new ObjectId(),
    sortOrder: input.sortOrder,
    source: input.source ?? (preservesIdentity ? existing.source : null),
    status: preservesIdentity ? existing.status : "pending",
    subject: input.subject,
    version: preservesIdentity ? existing.version : 1,
    workDate: input.workDate,
  };
}

export async function listProductionAreas({ activeOnly = true } = {}) {
  await ensureProductionTaskIndexes();
  const database = await getDatabase();
  return database
    .collection<ProductionAreaDocument>("production_areas")
    .find(activeOnly ? { status: "active" } : {})
    .sort({ sortOrder: 1, name: 1 })
    .toArray();
}

type ProductionAreaAuditDocument = {
  _id: ObjectId;
  action: "created" | "archived";
  actorPlatformUserId: ObjectId;
  changedFields: string[];
  createdAt: Date;
  targetAreaId: ObjectId;
};

export async function createProductionArea({
  actorPlatformUserId,
  input,
}: {
  actorPlatformUserId: string;
  input: ProductionAreaInput;
}): Promise<ProductionAreaDocument> {
  await ensureProductionTaskIndexes();
  const client = await getMongoClient();
  const database = await getDatabase();
  const now = new Date();
  const document: ProductionAreaDocument = {
    _id: new ObjectId(),
    createdAt: now,
    name: input.name,
    normalizedName: normalizeProductionLookup(input.name),
    sortOrder: await database.collection("production_areas").countDocuments(),
    status: "active",
    updatedAt: now,
  };
  try {
    await client.withSession((session) =>
      session.withTransaction(async () => {
        await database
          .collection<ProductionAreaDocument>("production_areas")
          .insertOne(document, { session });
        await database
          .collection<ProductionAreaAuditDocument>("production_area_audit")
          .insertOne(
            {
              _id: new ObjectId(),
              action: "created",
              actorPlatformUserId: new ObjectId(actorPlatformUserId),
              changedFields: ["name", "status", "sortOrder"],
              createdAt: now,
              targetAreaId: document._id,
            },
            { session },
          );
      }),
    );
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new ProductionTaskDomainError("area_exists");
    }
    throw error;
  }
  return document;
}

export async function archiveProductionArea({
  actorPlatformUserId,
  areaId,
}: {
  actorPlatformUserId: string;
  areaId: string;
}) {
  productionObjectIdSchema.parse(areaId);
  const client = await getMongoClient();
  const database = await getDatabase();
  await client.withSession((session) =>
    session.withTransaction(async () => {
      const now = new Date();
      const result = await database
        .collection<ProductionAreaDocument>("production_areas")
        .updateOne(
          { _id: new ObjectId(areaId), status: "active" },
          { $set: { status: "inactive", updatedAt: now } },
          { session },
        );
      if (!result.modifiedCount) throw new ProductionTaskDomainError("area_not_found");
      await database
        .collection<ProductionAreaAuditDocument>("production_area_audit")
        .insertOne(
          {
            _id: new ObjectId(),
            action: "archived",
            actorPlatformUserId: new ObjectId(actorPlatformUserId),
            changedFields: ["status"],
            createdAt: now,
            targetAreaId: new ObjectId(areaId),
          },
          { session },
        );
    }),
  );
}

export async function findProductionPlanById(planId: string) {
  productionObjectIdSchema.parse(planId);
  await ensureProductionTaskIndexes();
  const collection = await getPlanCollection();
  return collection.findOne({ _id: new ObjectId(planId) });
}

export async function findCurrentPublishedPlan(weekStart: string) {
  await ensureProductionTaskIndexes();
  const collection = await getPlanCollection();
  return collection.findOne({ currentSlot: "published", weekStart });
}

export async function listProductionPlans() {
  await ensureProductionTaskIndexes();
  const collection = await getPlanCollection();
  return collection
    .find(
      {},
      {
        projection: {
          createdAt: 1,
          currentSlot: 1,
          publishedAt: 1,
          revision: 1,
          status: 1,
          tasks: 1,
          updatedAt: 1,
          version: 1,
          weekEnd: 1,
          weekStart: 1,
        },
      },
    )
    .sort({ weekStart: -1, revision: -1 })
    .limit(104)
    .toArray();
}

export async function listProductionPlanRevisions(weekStart: string) {
  await ensureProductionTaskIndexes();
  const collection = await getPlanCollection();
  return collection.find({ weekStart }).sort({ revision: -1 }).limit(20).toArray();
}

export async function listProductionTaskTemplates() {
  await ensureProductionTaskIndexes();
  const database = await getDatabase();
  return database
    .collection<ProductionTaskTemplateDocument>("production_task_templates")
    .find({ status: "active" })
    .sort({ areaLabelSnapshot: 1, description: 1 })
    .limit(200)
    .toArray();
}

type ProductionTaskTemplateAuditDocument = {
  _id: ObjectId;
  action: "created" | "archived";
  actorPlatformUserId: ObjectId;
  changedFields: string[];
  createdAt: Date;
  targetTemplateId: ObjectId;
};

export async function createProductionTaskTemplate({
  actorPlatformUserId,
  areaLabelSnapshot,
  input,
}: {
  actorPlatformUserId: string;
  areaLabelSnapshot: string;
  input: ProductionTaskTemplateInput;
}): Promise<ProductionTaskTemplateDocument> {
  await ensureProductionTaskIndexes();
  const client = await getMongoClient();
  const database = await getDatabase();
  const now = new Date();
  const document: ProductionTaskTemplateDocument = {
    _id: new ObjectId(),
    areaId: new ObjectId(input.areaId),
    areaLabelSnapshot,
    createdAt: now,
    createdByPlatformUserId: new ObjectId(actorPlatformUserId),
    description: input.description,
    status: "active",
    subject: input.subject,
    updatedAt: now,
    updatedByPlatformUserId: new ObjectId(actorPlatformUserId),
    version: 1,
  };

  await client.withSession((session) =>
    session.withTransaction(async () => {
      await database
        .collection<ProductionTaskTemplateDocument>("production_task_templates")
        .insertOne(document, { session });
      await database
        .collection<ProductionTaskTemplateAuditDocument>(
          "production_task_template_audit",
        )
        .insertOne(
          {
            _id: new ObjectId(),
            action: "created",
            actorPlatformUserId: new ObjectId(actorPlatformUserId),
            changedFields: ["areaId", "description", "subject"],
            createdAt: now,
            targetTemplateId: document._id,
          },
          { session },
        );
    }),
  );
  return document;
}

export async function archiveProductionTaskTemplate({
  actorPlatformUserId,
  templateId,
}: {
  actorPlatformUserId: string;
  templateId: string;
}) {
  productionObjectIdSchema.parse(templateId);
  await ensureProductionTaskIndexes();
  const client = await getMongoClient();
  const database = await getDatabase();
  await client.withSession((session) =>
    session.withTransaction(async () => {
      const now = new Date();
      const result = await database
        .collection<ProductionTaskTemplateDocument>("production_task_templates")
        .updateOne(
          { _id: new ObjectId(templateId), status: "active" },
          {
            $inc: { version: 1 },
            $set: {
              status: "archived",
              updatedAt: now,
              updatedByPlatformUserId: new ObjectId(actorPlatformUserId),
            },
          },
          { session },
        );
      if (!result.modifiedCount) {
        throw new ProductionTaskDomainError("template_not_found");
      }
      await database
        .collection<ProductionTaskTemplateAuditDocument>(
          "production_task_template_audit",
        )
        .insertOne(
          {
            _id: new ObjectId(),
            action: "archived",
            actorPlatformUserId: new ObjectId(actorPlatformUserId),
            changedFields: ["status"],
            createdAt: now,
            targetTemplateId: new ObjectId(templateId),
          },
          { session },
        );
    }),
  );
}

export async function createOrGetProductionWeekDraft({
  actorPlatformUserId,
  weekStart,
}: {
  actorPlatformUserId: string;
  weekStart: string;
}): Promise<ProductionWeekPlanDocument> {
  await ensureProductionTaskIndexes();
  const client = await getMongoClient();
  const database = await getDatabase();

  return client.withSession(async (session) => {
    let result: ProductionWeekPlanDocument | null = null;

    try {
      await session.withTransaction(async () => {
        const collection = database.collection<ProductionWeekPlanDocument>(
          "production_week_plans",
        );
        const existing = await collection.findOne(
          { currentSlot: "draft", weekStart },
          { session },
        );
        if (existing) {
          result = existing;
          return;
        }

        const [latest, published] = await Promise.all([
          collection.findOne({ weekStart }, { session, sort: { revision: -1 } }),
          collection.findOne({ currentSlot: "published", weekStart }, { session }),
        ]);
        const document = createEmptyWeekDraft({
          actorPlatformUserId,
          revision: (latest?.revision ?? 0) + 1,
          weekStart,
        });

        if (published) {
          document.tasks = published.tasks.map((task) => ({ ...task }));
        }

        await collection.insertOne(document, { session });
        await recordProductionTaskAudit({
          action: published ? "plan_copied" : "plan_created",
          actorPlatformUserId,
          changedFields: ["weekStart", "weekEnd", "tasks"],
          session,
          targetPlanId: document._id.toHexString(),
        });
        result = document;
      });
    } catch (error) {
      if (!(error instanceof MongoServerError && error.code === 11000)) throw error;
      result = await database
        .collection<ProductionWeekPlanDocument>("production_week_plans")
        .findOne({ currentSlot: "draft", weekStart });
    }

    if (!result) throw new ProductionTaskDomainError("draft_conflict");
    return result;
  });
}

export async function saveProductionWeekDraft({
  auditAction = "plan_updated",
  actorPlatformUserId,
  copiedFromPlanId,
  expectedVersion,
  planId,
  tasks,
}: {
  auditAction?: Extract<ProductionTaskAuditAction, "import_committed" | "plan_updated">;
  actorPlatformUserId: string;
  copiedFromPlanId?: string;
  expectedVersion: number;
  planId: string;
  tasks: PreparedProductionTaskInput[];
}): Promise<ProductionWeekPlanDocument> {
  productionObjectIdSchema.parse(planId);
  await ensureProductionTaskIndexes();
  const client = await getMongoClient();
  const database = await getDatabase();

  return client.withSession(async (session) => {
    let result: ProductionWeekPlanDocument | null = null;
    await session.withTransaction(async () => {
      const collection = database.collection<ProductionWeekPlanDocument>(
        "production_week_plans",
      );
      const existing = await collection.findOne(
        { _id: new ObjectId(planId), currentSlot: "draft" },
        { session },
      );
      if (!existing) throw new ProductionTaskDomainError("draft_not_found");
      if (existing.version !== expectedVersion) {
        throw new ProductionTaskDomainError("stale_version");
      }

      const existingById = new Map(
        existing.tasks.map((task) => [task.id.toHexString(), task]),
      );
      const preparedTasks = tasks.map((task) =>
        prepareTaskDocument(task, existingById),
      );
      result = await collection.findOneAndUpdate(
        {
          _id: existing._id,
          currentSlot: "draft",
          version: expectedVersion,
        },
        {
          $inc: { version: 1 },
          $set: {
            ...(copiedFromPlanId
              ? { copiedFromPlanId: new ObjectId(copiedFromPlanId) }
              : {}),
            tasks: preparedTasks,
            updatedAt: new Date(),
            updatedByPlatformUserId: new ObjectId(actorPlatformUserId),
          },
        },
        { returnDocument: "after", session },
      );
      if (!result) throw new ProductionTaskDomainError("stale_version");

      await recordProductionTaskAudit({
        action: auditAction,
        actorPlatformUserId,
        changedFields: copiedFromPlanId ? ["tasks", "copiedFromPlanId"] : ["tasks"],
        session,
        targetPlanId: planId,
      });
    });

    if (!result) throw new ProductionTaskDomainError("draft_not_found");
    return result;
  });
}

export async function publishProductionWeekDraft({
  actorPlatformUserId,
  expectedVersion,
  planId,
}: {
  actorPlatformUserId: string;
  expectedVersion: number;
  planId: string;
}): Promise<ProductionWeekPlanDocument> {
  productionObjectIdSchema.parse(planId);
  await ensureProductionTaskIndexes();
  const client = await getMongoClient();
  const database = await getDatabase();

  return client.withSession(async (session) => {
    let result: ProductionWeekPlanDocument | null = null;
    await session.withTransaction(async () => {
      const collection = database.collection<ProductionWeekPlanDocument>(
        "production_week_plans",
      );
      const draft = await collection.findOne(
        { _id: new ObjectId(planId), currentSlot: "draft" },
        { session },
      );
      if (!draft) throw new ProductionTaskDomainError("draft_not_found");
      if (draft.version !== expectedVersion) {
        throw new ProductionTaskDomainError("stale_version");
      }

      const previousPublished = await collection.findOne(
        { currentSlot: "published", weekStart: draft.weekStart },
        { session },
      );
      const assignmentChanges = compareProductionPlanRevisions(
        previousPublished,
        draft,
      ).flatMap((change) =>
        change.affectedEmployeeIds.map(
          (employeeId): ProductionTaskAssignmentChangeDocument => ({
            _id: new ObjectId(),
            changeType: change.type,
            createdAt: new Date(),
            employeeId: new ObjectId(employeeId),
            planId: draft._id,
            readAt: null,
            revision: draft.revision,
            taskId: new ObjectId(change.taskId),
            weekStart: draft.weekStart,
          }),
        ),
      );

      await collection.updateOne(
        { currentSlot: "published", weekStart: draft.weekStart },
        {
          $set: {
            currentSlot: null,
            status: "superseded",
            updatedAt: new Date(),
            updatedByPlatformUserId: new ObjectId(actorPlatformUserId),
          },
          $inc: { version: 1 },
        },
        { session },
      );
      result = await collection.findOneAndUpdate(
        { _id: draft._id, currentSlot: "draft", version: expectedVersion },
        {
          $inc: { version: 1 },
          $set: {
            currentSlot: "published",
            publishedAt: new Date(),
            publishedByPlatformUserId: new ObjectId(actorPlatformUserId),
            status: "published",
            updatedAt: new Date(),
            updatedByPlatformUserId: new ObjectId(actorPlatformUserId),
          },
        },
        { returnDocument: "after", session },
      );
      if (!result) throw new ProductionTaskDomainError("stale_version");

      if (assignmentChanges.length) {
        await database
          .collection<ProductionTaskAssignmentChangeDocument>(
            "production_task_assignment_changes",
          )
          .insertMany(assignmentChanges, { session });
      }

      await recordProductionTaskAudit({
        action: "plan_published",
        actorPlatformUserId,
        changedFields: ["status", "publishedAt", "revision"],
        session,
        targetPlanId: planId,
      });
    });

    if (!result) throw new ProductionTaskDomainError("draft_not_found");
    return result;
  });
}

export async function transitionProductionTask({
  action,
  actorEmployeeId,
  actorPlatformUserId,
  expectedVersion,
  planId,
  taskId,
}: {
  action: "completed" | "reopened";
  actorEmployeeId: string;
  actorPlatformUserId: string;
  expectedVersion: number;
  planId: string;
  taskId: string;
}): Promise<ProductionWeekPlanDocument> {
  productionObjectIdSchema.parse(planId);
  productionObjectIdSchema.parse(taskId);
  const client = await getMongoClient();
  const database = await getDatabase();

  return client.withSession(async (session) => {
    let result: ProductionWeekPlanDocument | null = null;
    await session.withTransaction(async () => {
      const collection = database.collection<ProductionWeekPlanDocument>(
        "production_week_plans",
      );
      const expectedStatus = action === "completed" ? "pending" : "completed";
      const now = new Date();
      result = await collection.findOneAndUpdate(
        {
          _id: new ObjectId(planId),
          currentSlot: "published",
          tasks: {
            $elemMatch: {
              id: new ObjectId(taskId),
              status: expectedStatus,
              version: expectedVersion,
            },
          },
        },
        {
          $inc: { "tasks.$.version": 1, version: 1 },
          $set: {
            "tasks.$.completedAt": action === "completed" ? now : null,
            "tasks.$.completedByEmployeeId":
              action === "completed" ? new ObjectId(actorEmployeeId) : null,
            "tasks.$.status": action === "completed" ? "completed" : "pending",
            updatedAt: now,
            updatedByPlatformUserId: new ObjectId(actorPlatformUserId),
          },
        },
        { returnDocument: "after", session },
      );
      if (!result) throw new ProductionTaskDomainError("stale_version");

      await database
        .collection<ProductionTaskActivityDocument>("production_task_activity")
        .insertOne(
          {
            _id: new ObjectId(),
            action,
            performedAt: now,
            performedByEmployeeId: new ObjectId(actorEmployeeId),
            planId: new ObjectId(planId),
            taskId: new ObjectId(taskId),
            taskVersion: expectedVersion + 1,
          },
          { session },
        );
      await recordProductionTaskAudit({
        action: action === "completed" ? "task_completed" : "task_reopened",
        actorPlatformUserId,
        changedFields: ["status", "completedAt", "completedByEmployeeId"],
        session,
        targetPlanId: planId,
        targetTaskId: taskId,
      });
    });

    if (!result) throw new ProductionTaskDomainError("task_not_found");
    return result;
  });
}

export async function listTaskActivity(planId: string, taskId: string) {
  productionObjectIdSchema.parse(planId);
  productionObjectIdSchema.parse(taskId);
  const database = await getDatabase();
  return database
    .collection<ProductionTaskActivityDocument>("production_task_activity")
    .find({ planId: new ObjectId(planId), taskId: new ObjectId(taskId) })
    .sort({ performedAt: -1 })
    .limit(50)
    .toArray();
}

export async function findTaskInPublishedPlan(planId: string, taskId: string) {
  const plan = await findProductionPlanById(planId);
  if (!plan || plan.currentSlot !== "published") return null;
  const task = plan.tasks.find((candidate) => candidate.id.toHexString() === taskId);
  return task ? { plan, task } : null;
}

export async function listUnreadProductionAssignmentChanges(employeeId: string) {
  productionObjectIdSchema.parse(employeeId);
  await ensureProductionTaskIndexes();
  const database = await getDatabase();
  return database
    .collection<ProductionTaskAssignmentChangeDocument>(
      "production_task_assignment_changes",
    )
    .find({ employeeId: new ObjectId(employeeId), readAt: null })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
}

export async function markProductionAssignmentChangesRead(employeeId: string) {
  productionObjectIdSchema.parse(employeeId);
  const database = await getDatabase();
  return database
    .collection<ProductionTaskAssignmentChangeDocument>(
      "production_task_assignment_changes",
    )
    .updateMany(
      { employeeId: new ObjectId(employeeId), readAt: null },
      { $set: { readAt: new Date() } },
    );
}

export async function commitProductionImportDrafts({
  actorPlatformUserId,
  expectedPreviewVersion,
  previewId,
  sheets,
  workbookHash,
}: {
  actorPlatformUserId: string;
  expectedPreviewVersion: number;
  previewId: string;
  sheets: Array<{
    mode: "merge" | "replace";
    tasks: PreparedProductionTaskInput[];
    weekStart: string;
  }>;
  workbookHash: string;
}): Promise<string[]> {
  productionObjectIdSchema.parse(previewId);
  await ensureProductionTaskIndexes();
  const client = await getMongoClient();
  const database = await getDatabase();

  return client.withSession(async (session) => {
    const planIds: string[] = [];
    await session.withTransaction(async () => {
      const plans = database.collection<ProductionWeekPlanDocument>(
        "production_week_plans",
      );
      for (const sheet of sheets) {
        let draft = await plans.findOne(
          { currentSlot: "draft", weekStart: sheet.weekStart },
          { session },
        );
        if (!draft) {
          const [latest, published] = await Promise.all([
            plans.findOne(
              { weekStart: sheet.weekStart },
              { session, sort: { revision: -1 } },
            ),
            plans.findOne(
              { currentSlot: "published", weekStart: sheet.weekStart },
              { session },
            ),
          ]);
          draft = createEmptyWeekDraft({
            actorPlatformUserId,
            revision: (latest?.revision ?? 0) + 1,
            weekStart: sheet.weekStart,
          });
          if (published) draft.tasks = published.tasks.map((task) => ({ ...task }));
          await plans.insertOne(draft, { session });
          await recordProductionTaskAudit({
            action: published ? "plan_copied" : "plan_created",
            actorPlatformUserId,
            changedFields: ["weekStart", "weekEnd", "tasks"],
            session,
            targetPlanId: draft._id.toHexString(),
          });
        }

        if (
          sheet.mode === "merge" &&
          sheet.tasks.some((incoming) =>
            draft!.tasks.some((existing) => sameDefinition(existing, incoming)),
          )
        ) {
          throw new ProductionTaskDomainError("import_invalid");
        }
        const existingById = new Map(
          draft.tasks.map((task) => [task.id.toHexString(), task]),
        );
        const imported = sheet.tasks.map((task) =>
          prepareTaskDocument(task, existingById),
        );
        const tasks =
          sheet.mode === "replace" ? imported : [...draft.tasks, ...imported];
        const updated = await plans.findOneAndUpdate(
          { _id: draft._id, currentSlot: "draft", version: draft.version },
          {
            $inc: { version: 1 },
            $set: {
              tasks: tasks.map((task, sortOrder) => ({ ...task, sortOrder })),
              updatedAt: new Date(),
              updatedByPlatformUserId: new ObjectId(actorPlatformUserId),
            },
          },
          { returnDocument: "after", session },
        );
        if (!updated) throw new ProductionTaskDomainError("stale_version");
        draft = updated;
        planIds.push(updated._id.toHexString());
        await recordProductionTaskAudit({
          action: "import_committed",
          actorPlatformUserId,
          changedFields: ["tasks"],
          metadata: {
            importedRowCount: sheet.tasks.length,
            importModes: [sheet.mode],
            mappedAreaIds: [...new Set(sheet.tasks.map((task) => task.areaId))],
            mappedEmployeeIds: [
              ...new Set(sheet.tasks.flatMap((task) => task.assigneeEmployeeIds)),
            ],
            sourceSheetCount: 1,
            workbookHash,
          },
          session,
          targetPlanId: updated._id.toHexString(),
        });
      }

      const previewUpdate = await database
        .collection<ProductionImportPreviewDocument>("production_task_import_previews")
        .updateOne(
          {
            _id: new ObjectId(previewId),
            actorPlatformUserId: new ObjectId(actorPlatformUserId),
            expiresAt: { $gt: new Date() },
            status: "preview",
            version: expectedPreviewVersion,
          },
          {
            $inc: { version: 1 },
            $set: { committedAt: new Date(), status: "committed" },
          },
          { session },
        );
      if (!previewUpdate.modifiedCount) {
        throw new ProductionTaskDomainError("stale_version");
      }
    });
    return [...new Set(planIds)];
  });
}
