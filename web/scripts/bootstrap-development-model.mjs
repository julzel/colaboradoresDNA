import { MongoClient, ServerApiVersion } from "mongodb";
import { z } from "zod";

const environmentSchema = z.object({
  MONGODB_DB: z.string().min(1),
  MONGODB_URI: z.string().url().startsWith("mongodb"),
});

// Keep these reviewed definitions synchronized with
// src/features/development/server/development-indexes.ts. This script is run by
// a migration principal; the application runtime does not create these indexes.
const collectionIndexes = {
  development_audit: [
    {
      key: { employeeId: 1, createdAt: -1 },
      options: {
        name: "development_audit_employee_timeline",
        partialFilterExpression: { employeeId: { $type: "objectId" } },
      },
    },
    {
      key: { resourceType: 1, resourceId: 1, createdAt: -1 },
      options: { name: "development_audit_resource_timeline" },
    },
    {
      key: { actorPlatformUserId: 1, createdAt: -1 },
      options: { name: "development_audit_actor_timeline" },
    },
  ],
  development_goal_updates: [
    {
      key: { goalId: 1, occurredAt: -1 },
      options: { name: "development_goal_updates_timeline" },
    },
  ],
  development_goals: [
    {
      key: { employeeId: 1, status: 1, targetDate: 1 },
      options: { name: "development_goals_employee_status_due" },
    },
    {
      key: { linkedSkillIds: 1, status: 1, targetDate: 1 },
      options: { name: "development_goals_linked_skills" },
    },
  ],
  development_one_on_ones: [
    {
      key: { employeeId: 1, occurredOn: -1 },
      options: { name: "development_one_on_ones_employee_timeline" },
    },
    {
      key: { authorPlatformUserId: 1, status: 1, updatedAt: -1 },
      options: {
        name: "development_one_on_ones_draft_owner",
        partialFilterExpression: { status: "draft" },
      },
    },
    {
      key: { employeeId: 1, "actionItems.status": 1, "actionItems.dueOn": 1 },
      options: { name: "development_one_on_ones_open_actions" },
    },
    {
      key: { calendarEventId: 1 },
      options: {
        name: "development_one_on_ones_calendar_event_unique",
        partialFilterExpression: { calendarEventId: { $type: "objectId" } },
        unique: true,
      },
    },
  ],
  development_profiles: [
    {
      key: { employeeId: 1 },
      options: {
        name: "development_profiles_employee_unique",
        unique: true,
      },
    },
  ],
  development_skills: [
    {
      key: { normalizedName: 1 },
      options: {
        name: "development_skills_active_name_unique",
        partialFilterExpression: { status: "active" },
        unique: true,
      },
    },
    {
      key: { status: 1, category: 1, name: 1 },
      options: { name: "development_skills_catalog" },
    },
  ],
  employee_skill_assessment_history: [
    {
      key: { employeeId: 1, skillId: 1, assessedAt: -1 },
      options: { name: "employee_skill_assessment_history_timeline" },
    },
  ],
  employee_skill_assessments: [
    {
      key: { employeeId: 1, skillId: 1 },
      options: {
        name: "employee_skill_assessments_current_unique",
        unique: true,
      },
    },
    {
      key: { skillId: 1, employeeId: 1 },
      options: { name: "employee_skill_assessments_matrix" },
    },
  ],
};

async function bootstrap() {
  const environment = environmentSchema.parse(process.env);
  const client = new MongoClient(environment.MONGODB_URI, {
    serverApi: {
      deprecationErrors: true,
      strict: true,
      version: ServerApiVersion.v1,
    },
  });

  try {
    await client.connect();
    const database = client.db(environment.MONGODB_DB);

    await Promise.all(
      Object.entries(collectionIndexes).flatMap(([collectionName, indexes]) =>
        indexes.map(({ key, options }) =>
          database.collection(collectionName).createIndex(key, options),
        ),
      ),
    );

    console.info("El modelo de desarrollo de colaboradores quedó listo.");
  } finally {
    await client.close();
  }
}

bootstrap().catch(() => {
  console.error(
    "La inicialización de desarrollo falló de forma segura. Revisá la conexión a la base de datos.",
  );
  process.exitCode = 1;
});
