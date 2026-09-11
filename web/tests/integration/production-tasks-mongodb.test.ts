// @vitest-environment node
import { randomUUID } from "node:crypto";
import { ObjectId, type Db } from "mongodb";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { getDatabase, getMongoClient } from "@/lib/server/mongodb";
import {
  createProductionImportPreview,
  configureProductionImport,
  commitProductionImport,
  getProductionImportPreview,
} from "@/features/production-tasks/server/production-task-import-service";
import {
  getPublishedProductionBoard,
  getProductionPlanEditor,
  publishProductionWeekAsManager,
} from "@/features/production-tasks/server/production-task-service";
import { createProductionTaskTemplateBuffer } from "@/features/production-tasks/server/production-task-template-service";
import type { ProductionImportPreviewResult } from "@/features/production-tasks/application/production-task-contracts";
import ExcelJS from "exceljs";
vi.setConfig({ testTimeout: 60000, hookTimeout: 60000 });

const actor = vi.hoisted(() => ({ id: "", role: "administrator" }));
vi.mock("server-only", () => ({}));
vi.mock("@/features/auth/server/require-platform-user", () => ({
  requirePlatformUser: async () => ({ platformUser: { ...actor } }),
}));
vi.mock(
  "@/features/production-tasks/integrations/production-task-availability-adapter",
  () => ({
    productionTaskAvailabilityAdapter: {
      check: async () => ({ hasApprovedLeave: false, scheduleStatus: "scheduled" }),
    },
  }),
);
const databaseName = `dna_tasks_${randomUUID().replaceAll("-", "").slice(0, 24)}`;
const adminId = new ObjectId(),
  supervisorId = new ObjectId(),
  employeeId = new ObjectId(),
  workerId = new ObjectId(),
  workerEmployeeId = new ObjectId(),
  departmentId = new ObjectId(),
  areaId = new ObjectId();
let database: Db;
let created = false;
const csv = (description = "Preparar") =>
  Buffer.from(
    `Fecha,Área de trabajo,Producto,Encargado 1,Tarea\n2026/09/07,Cocina,Producto,DNA-0002,${description}`,
  );
async function configure(
  preview: ProductionImportPreviewResult,
  weekStart = "2026-09-07",
) {
  return configureProductionImport({
    previewId: preview.id,
    expectedVersion: preview.version,
    sheets: preview.sheets.map((sheet) => ({
      name: sheet.name,
      selected: true,
      weekStart,
      mode: "replace",
    })),
    rows: preview.sheets.flatMap((sheet) =>
      sheet.rows.map((row) => ({
        key: row.key,
        areaId: row.areaId,
        assigneeEmployeeIds: row.assigneeEmployeeIds,
      })),
    ),
  });
}
const commitInput = (
  preview: ProductionImportPreviewResult,
  overrideConfirmed = true,
) => ({
  previewId: preview.id,
  expectedVersion: preview.version,
  targets: preview.targets,
  overrideConfirmed,
});

describe.skipIf(process.env.RUN_TASKS_LIVE !== "1")(
  "weekly tasks real MongoDB, isolated synthetic database",
  () => {
    beforeAll(async () => {
      vi.stubEnv("MONGODB_DB", databaseName);
      database = await getDatabase();
      if ((await database.listCollections().toArray()).length)
        throw new Error("Refusing to reuse a database");
      created = true;
      await database.collection("production_areas").insertOne({
        _id: areaId,
        name: "Cocina",
        normalizedName: "cocina",
        status: "active",
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await database.collection("production_week_plans").createIndex(
        { weekStart: 1, currentSlot: 1 },
        {
          unique: true,
          partialFilterExpression: { currentSlot: { $in: ["draft", "published"] } },
        },
      );
      await database.collection("platform_users").insertMany([
        {
          _id: adminId,
          role: "administrator",
          status: "active",
          normalizedEmail: "admin@audit.invalid",
        },
        {
          _id: supervisorId,
          role: "supervisor",
          status: "active",
          normalizedEmail: "supervisor@audit.invalid",
        },
        {
          _id: workerId,
          role: "collaborator",
          status: "active",
          normalizedEmail: "worker@audit.invalid",
        },
      ]);
      await database.collection("employees").insertMany([
        {
          _id: employeeId,
          platformUserId: supervisorId,
          employeeCode: "DNA-0001",
          givenNames: "Synthetic",
          firstSurname: "Supervisor",
          secondSurname: "",
          preferredName: null,
          employmentStatus: "active",
        },
        {
          _id: workerEmployeeId,
          platformUserId: workerId,
          employeeCode: "DNA-0002",
          givenNames: "Synthetic",
          firstSurname: "Worker",
          secondSurname: "",
          preferredName: null,
          employmentStatus: "active",
        },
      ]);
      await database.collection("departments").insertOne({
        _id: departmentId,
        normalizedName: "produccion",
        name: "Producción",
        status: "active",
      });
      await database.collection("employee_assignments").insertOne({
        employeeId,
        departmentId,
        effectiveFrom: "2020-01-01",
        effectiveTo: null,
      });
      actor.id = adminId.toHexString();
    }, 60000);
    afterAll(async () => {
      if (
        created &&
        database.databaseName === databaseName &&
        /^dna_tasks_[a-f0-9]{24}$/.test(databaseName)
      )
        await database.dropDatabase();
      await (await getMongoClient()).close();
      vi.unstubAllEnvs();
    });

    it("restricts supervisor management to an effective active production department", async () => {
      actor.id = supervisorId.toHexString();
      actor.role = "supervisor";
      await expect(createProductionTaskTemplateBuffer()).resolves.toBeDefined();
      await database
        .collection("departments")
        .updateOne({ _id: departmentId }, { $set: { status: "inactive" } });
      await expect(createProductionTaskTemplateBuffer()).rejects.toMatchObject({
        code: "forbidden",
      });
      await database
        .collection("departments")
        .updateOne({ _id: departmentId }, { $set: { status: "active" } });
      await database
        .collection("employee_assignments")
        .updateOne({ employeeId }, { $set: { effectiveFrom: "2099-01-01" } });
      await expect(createProductionTaskTemplateBuffer()).rejects.toMatchObject({
        code: "forbidden",
      });
      await database
        .collection("employee_assignments")
        .updateOne({ employeeId }, { $set: { effectiveFrom: "2020-01-01" } });
      actor.id = adminId.toHexString();
      actor.role = "administrator";
    });

    it("round-trips the template, keeps previews private, and requires mapping names", async () => {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await createProductionTaskTemplateBuffer());
      workbook.getWorksheet("Tareas")!.getRow(3).values = [
        new Date("2026-09-07T00:00:00Z"),
        "Lunes",
        "Cocina",
        "",
        "Preparar",
        "DNA-0002",
      ];
      const preview = await configure(
        await createProductionImportPreview({
          buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
          fileName: "template.xlsx",
          year: 2026,
        }),
      );
      expect(preview.canCommit).toBe(true);
      actor.id = supervisorId.toHexString();
      actor.role = "supervisor";
      expect(await getProductionImportPreview(preview.id)).toBeNull();
      actor.id = adminId.toHexString();
      actor.role = "administrator";
      const legacy = await configure(
        await createProductionImportPreview({
          buffer: Buffer.from(csv().toString().replace("DNA-0002", "Synthetic Worker")),
          fileName: "legacy.csv",
          year: 2026,
        }),
      );
      expect(legacy.canCommit).toBe(false);
    });

    it("imports, publishes, reads personal assignments, and preserves revisions on confirmed replacement", async () => {
      const preview = await configure(
        await createProductionImportPreview({
          buffer: csv(),
          fileName: "week.csv",
          year: 2026,
        }),
      );
      expect(preview.canCommit).toBe(true);
      const [planId] = await commitProductionImport(commitInput(preview));
      await expect(commitProductionImport(commitInput(preview))).rejects.toMatchObject({
        code: "import_expired",
      });
      expect(
        (await getPublishedProductionBoard({ date: "2026-09-07", view: "week" })).tasks,
      ).toHaveLength(0);
      const draft = (await getProductionPlanEditor(planId!))!;
      await publishProductionWeekAsManager({
        planId: planId!,
        expectedVersion: draft.plan.version,
      });
      actor.id = workerId.toHexString();
      actor.role = "collaborator";
      const board = await getPublishedProductionBoard({
        date: "2026-09-07",
        view: "week",
      });
      expect(board.tasks).toHaveLength(1);
      expect(board.currentEmployeeId).toBe(workerEmployeeId.toHexString());
      expect(board.canManage).toBe(false);
      expect(JSON.stringify(board)).not.toContain("@audit.invalid");
      await expect(getProductionPlanEditor(planId!)).rejects.toMatchObject({
        code: "forbidden",
      });
      actor.id = adminId.toHexString();
      actor.role = "administrator";
      const replacement = await configure(
        await createProductionImportPreview({
          buffer: csv("Empacar"),
          fileName: "replacement.csv",
          year: 2026,
        }),
      );
      await expect(
        commitProductionImport(commitInput(replacement, false)),
      ).rejects.toMatchObject({ code: "draft_conflict" });
      const [replacementId] = await commitProductionImport(commitInput(replacement));
      expect(
        (await getPublishedProductionBoard({ date: "2026-09-07" })).tasks[0]
          ?.description,
      ).toBe("Preparar");
      const next = (await getProductionPlanEditor(replacementId!))!;
      await publishProductionWeekAsManager({
        planId: replacementId!,
        expectedVersion: next.plan.version,
      });
      expect(
        (await getPublishedProductionBoard({ date: "2026-09-07" })).tasks[0]
          ?.description,
      ).toBe("Empacar");
      expect(
        (
          await database
            .collection("production_week_plans")
            .findOne({ _id: new ObjectId(planId) })
        )?.status,
      ).toBe("superseded");
      expect(
        await database
          .collection("production_task_audit")
          .countDocuments({ actorPlatformUserId: adminId }),
      ).toBeGreaterThan(0);
    });

    it("retains replaced drafts and rejects expired previews", async () => {
      const create = async (task: string) =>
        configure(
          await createProductionImportPreview({
            buffer: Buffer.from(
              csv(task).toString().replace("2026/09/07", "2026/10/12"),
            ),
            fileName: "draft.csv",
            year: 2026,
          }),
          "2026-10-12",
        );
      const first = await create("Primera tarea");
      const [firstId] = await commitProductionImport(commitInput(first));
      const second = await create("Segunda tarea");
      const [secondId] = await commitProductionImport(commitInput(second));
      expect(secondId).not.toBe(firstId);
      const historic = await database
        .collection("production_week_plans")
        .findOne({ _id: new ObjectId(firstId) });
      expect(historic?.status).toBe("superseded");
      expect(historic?.tasks[0].description).toBe("Primera tarea");
      const active = (await getProductionPlanEditor(secondId!))!;
      await publishProductionWeekAsManager({
        planId: secondId!,
        expectedVersion: active.plan.version,
      });
      const expired = await create("Expired");
      await database
        .collection("production_task_import_previews")
        .updateOne(
          { _id: new ObjectId(expired.id) },
          { $set: { expiresAt: new Date(0) } },
        );
      await expect(commitProductionImport(commitInput(expired))).rejects.toMatchObject({
        code: "import_expired",
      });
    });

    it("rejects stale target confirmations and rolls back the entire multi-week import", async () => {
      const preview = await configure(
        await createProductionImportPreview({
          buffer: csv("Revisar"),
          fileName: "stale.csv",
          year: 2026,
        }),
      );
      const target = preview.targets[0]!.published!;
      await database
        .collection("production_week_plans")
        .updateOne({ _id: new ObjectId(target.id) }, { $inc: { version: 1 } });
      await expect(commitProductionImport(commitInput(preview))).rejects.toMatchObject({
        code: "stale_version",
      });
      expect((await getProductionImportPreview(preview.id))?.version).toBe(
        preview.version,
      );
      expect(
        await database
          .collection("production_week_plans")
          .countDocuments({ currentSlot: "draft" }),
      ).toBe(0);
      const workbook = new ExcelJS.Workbook();
      for (const name of ["New", "Conflict"])
        workbook.addWorksheet(name).addRows([
          ["Día", "Área", "Producto", "Encargado 1", "Tarea"],
          ["Lunes", "Cocina", "", "DNA-0002", "Preparar"],
        ]);
      const multi = await createProductionImportPreview({
        buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
        fileName: "multi.xlsx",
        year: 2026,
      });
      const reviewed = await configureProductionImport({
        previewId: multi.id,
        expectedVersion: multi.version,
        sheets: multi.sheets.map((sheet, index) => ({
          name: sheet.name,
          selected: true,
          weekStart: index ? "2026-09-07" : "2026-10-05",
          mode: "replace",
        })),
        rows: multi.sheets.flatMap((sheet) =>
          sheet.rows.map((row) => ({
            key: row.key,
            areaId: row.areaId,
            assigneeEmployeeIds: row.assigneeEmployeeIds,
          })),
        ),
      });
      await database
        .collection("production_week_plans")
        .updateOne({ _id: new ObjectId(target.id) }, { $inc: { version: 1 } });
      await expect(commitProductionImport(commitInput(reviewed))).rejects.toMatchObject(
        { code: "stale_version" },
      );
      expect(
        await database
          .collection("production_week_plans")
          .countDocuments({ weekStart: "2026-10-05" }),
      ).toBe(0);
    });

    it("allows only one competing first import and preserves former employee labels", async () => {
      const previews = await Promise.all(
        ["Primera", "Segunda"].map(async (task) =>
          configure(
            await createProductionImportPreview({
              buffer: Buffer.from(
                csv(task).toString().replace("2026/09/07", "2026/11/02"),
              ),
              fileName: "race.csv",
              year: 2026,
            }),
            "2026-11-02",
          ),
        ),
      );
      const outcomes = await Promise.allSettled(
        previews.map((preview) => commitProductionImport(commitInput(preview))),
      );
      expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(
        1,
      );
      expect(outcomes.filter((outcome) => outcome.status === "rejected")).toHaveLength(
        1,
      );
      const rejected = outcomes.find(
        (outcome) => outcome.status === "rejected",
      ) as PromiseRejectedResult;
      expect(rejected.reason.code).toBe("stale_version");
      expect(
        await database
          .collection("production_week_plans")
          .countDocuments({ weekStart: "2026-11-02", currentSlot: "draft" }),
      ).toBe(1);
      await database
        .collection("employees")
        .updateOne(
          { _id: workerEmployeeId },
          { $set: { employmentStatus: "inactive" } },
        );
      const board = await getPublishedProductionBoard({ date: "2026-09-07" });
      expect(board.employees).toContainEqual(
        expect.objectContaining({
          id: workerEmployeeId.toHexString(),
          displayName: "Synthetic Worker",
        }),
      );
    });
  },
);
