import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import { z } from "zod";

const environmentSchema = z.object({
  MONGODB_DB: z.string().min(1),
  MONGODB_URI: z.string().url().startsWith("mongodb"),
});

const indexes = {
  production_area_audit: [
    { key: { targetAreaId: 1, createdAt: -1 }, name: "production_area_audit_timeline" },
  ],
  production_task_assignment_changes: [
    {
      key: { employeeId: 1, readAt: 1, createdAt: -1 },
      name: "production_task_assignment_changes_inbox",
    },
    {
      key: { planId: 1, taskId: 1, employeeId: 1, changeType: 1 },
      name: "production_task_assignment_changes_unique",
      unique: true,
    },
  ],
  production_task_import_previews: [
    {
      key: { expiresAt: 1 },
      expireAfterSeconds: 0,
      name: "production_task_import_previews_expiry",
    },
    {
      key: { actorPlatformUserId: 1, createdAt: -1 },
      name: "production_task_import_previews_actor",
    },
  ],
  production_areas: [
    {
      key: { normalizedName: 1 },
      name: "production_areas_normalized_name_unique",
      unique: true,
    },
    { key: { status: 1, sortOrder: 1, name: 1 }, name: "production_areas_directory" },
  ],
  production_task_activity: [
    {
      key: { taskId: 1, performedAt: -1 },
      name: "production_task_activity_task_timeline",
    },
    {
      key: { performedByEmployeeId: 1, performedAt: -1 },
      name: "production_task_activity_actor_timeline",
    },
  ],
  production_task_audit: [
    {
      key: { targetPlanId: 1, createdAt: -1 },
      name: "production_task_audit_plan_timeline",
    },
    {
      key: { actorPlatformUserId: 1, createdAt: -1 },
      name: "production_task_audit_actor_timeline",
    },
  ],
  production_task_template_audit: [
    {
      key: { targetTemplateId: 1, createdAt: -1 },
      name: "production_task_template_audit_timeline",
    },
  ],
  production_task_templates: [
    {
      key: { status: 1, areaId: 1, description: 1 },
      name: "production_task_templates_directory",
    },
  ],
  production_week_plans: [
    {
      key: { weekStart: 1, currentSlot: 1 },
      name: "production_week_plans_current_slot_unique",
      partialFilterExpression: { currentSlot: { $type: "string" } },
      unique: true,
    },
    { key: { weekStart: -1, revision: -1 }, name: "production_week_plans_timeline" },
    { key: { status: 1, weekStart: 1 }, name: "production_week_plans_status_range" },
    { key: { "tasks.id": 1, status: 1 }, name: "production_week_plans_task_lookup" },
    {
      key: { "tasks.assigneeEmployeeIds": 1, status: 1, "tasks.workDate": 1 },
      name: "production_week_plans_assignee_day",
    },
  ],
};

const areaNames = [
  "Cocinado",
  "Congelado",
  "Deshidratado y suplementos",
  "Etiquetado",
  "Cuarto frío",
  "Materia prima",
  "Cocina",
  "Cocina y hornos",
  "Rutas",
  "Inventario",
];

function normalize(value) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-CR");
}

async function report(database) {
  const [employeesWithoutCode, plans, duplicateSlots] = await Promise.all([
    database
      .collection("employees")
      .countDocuments({ employeeCode: { $not: { $type: "string" } } }),
    database.collection("production_week_plans").countDocuments(),
    database
      .collection("production_week_plans")
      .aggregate([
        { $match: { currentSlot: { $type: "string" } } },
        {
          $group: {
            _id: { weekStart: "$weekStart", currentSlot: "$currentSlot" },
            count: { $sum: 1 },
          },
        },
        { $match: { count: { $gt: 1 } } },
        { $count: "total" },
      ])
      .next(),
  ]);
  return {
    duplicateCurrentSlots: duplicateSlots?.total ?? 0,
    employeesWithoutCode,
    productionPlans: plans,
  };
}

async function bootstrap() {
  const environment = environmentSchema.parse(process.env);
  const dryRun = process.argv.includes("--dry-run");
  const client = new MongoClient(environment.MONGODB_URI, {
    serverApi: { deprecationErrors: true, strict: true, version: ServerApiVersion.v1 },
  });
  try {
    await client.connect();
    const database = client.db(environment.MONGODB_DB);
    const preflight = await report(database);
    console.info(JSON.stringify({ dryRun, preflight }));
    if (preflight.duplicateCurrentSlots > 0) {
      throw new Error("Resolve duplicate current plan slots before bootstrapping.");
    }
    if (dryRun) return;

    for (const [collectionName, definitions] of Object.entries(indexes)) {
      await database
        .collection(collectionName)
        .createIndexes(definitions.map(({ key, ...options }) => ({ key, ...options })));
    }
    const now = new Date();
    await database.collection("production_areas").bulkWrite(
      areaNames.map((name, sortOrder) => ({
        updateOne: {
          filter: { normalizedName: normalize(name) },
          update: {
            $setOnInsert: {
              _id: new ObjectId(),
              createdAt: now,
              name,
              normalizedName: normalize(name),
              sortOrder,
              status: "active",
              updatedAt: now,
            },
          },
          upsert: true,
        },
      })),
    );
    console.info(
      JSON.stringify({ completed: true, postflight: await report(database) }),
    );
  } finally {
    await client.close();
  }
}

bootstrap().catch(() => {
  console.error("La inicialización de tareas de producción falló de forma segura.");
  process.exitCode = 1;
});
