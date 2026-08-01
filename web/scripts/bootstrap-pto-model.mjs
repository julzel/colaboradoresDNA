import { MongoClient, ServerApiVersion } from "mongodb";
import { z } from "zod";

const environmentSchema = z.object({
  MONGODB_DB: z.string().min(1),
  MONGODB_URI: z.string().url().startsWith("mongodb"),
  PTO_SUPERVISOR_APPROVER_EMAIL: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim().length === 0 ? undefined : value,
    z.email().optional(),
  ),
});

const collectionIndexes = {
  pto_audit: [
    {
      key: { targetRequestId: 1, createdAt: -1 },
      options: {
        name: "pto_audit_request_timeline",
        partialFilterExpression: { targetRequestId: { $type: "objectId" } },
      },
    },
    {
      key: { targetEmployeeId: 1, createdAt: -1 },
      options: {
        name: "pto_audit_employee_timeline",
        partialFilterExpression: { targetEmployeeId: { $type: "objectId" } },
      },
    },
    {
      key: { actorPlatformUserId: 1, createdAt: -1 },
      options: { name: "pto_audit_actor_timeline" },
    },
  ],
  pto_balance_ledger: [
    {
      key: { employeeId: 1, createdAt: -1 },
      options: { name: "pto_ledger_employee_timeline" },
    },
    {
      key: { requestId: 1, kind: 1 },
      options: {
        name: "pto_ledger_approved_request_unique",
        partialFilterExpression: { kind: "approved_request" },
        unique: true,
      },
    },
  ],
  pto_balances: [
    {
      key: { employeeId: 1 },
      options: { name: "pto_balances_employee_unique", unique: true },
    },
  ],
  pto_requests: [
    {
      key: { requesterEmployeeId: 1, createdAt: -1 },
      options: { name: "pto_requests_requester_timeline" },
    },
    {
      key: { requesterEmployeeId: 1, status: 1, startDate: 1, endDate: 1 },
      options: { name: "pto_requests_requester_range" },
    },
    {
      key: { assignedApproverPlatformUserId: 1, status: 1, submittedAt: 1 },
      options: {
        name: "pto_requests_approver_queue",
        partialFilterExpression: {
          assignedApproverPlatformUserId: { $type: "objectId" },
        },
      },
    },
    {
      key: { status: 1, startDate: 1, endDate: 1 },
      options: { name: "pto_requests_calendar_range" },
    },
  ],
};

async function configureSupervisorApprover(database, email) {
  const normalizedEmail = email.toLocaleLowerCase("en-US").trim();
  const approver = await database.collection("platform_users").findOne({
    normalizedEmail,
    status: "active",
  });
  if (!approver) {
    throw new Error("PTO_SUPERVISOR_APPROVER_EMAIL must identify an active account.");
  }
  const now = new Date();
  await database.collection("pto_settings").updateOne(
    { _id: "global" },
    {
      $set: {
        supervisorApproverPlatformUserId: approver._id,
        updatedAt: now,
        updatedByPlatformUserId: approver._id,
      },
      $setOnInsert: { _id: "global" },
    },
    { upsert: true },
  );
}

async function validateCurrentSetting(database) {
  const setting = await database.collection("pto_settings").findOne({ _id: "global" });
  if (!setting) return false;
  const approver = await database.collection("platform_users").findOne({
    _id: setting.supervisorApproverPlatformUserId,
    status: "active",
  });
  if (!approver) {
    throw new Error("The configured supervisor PTO approver is not active.");
  }
  return true;
}

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
    if (environment.PTO_SUPERVISOR_APPROVER_EMAIL) {
      await configureSupervisorApprover(
        database,
        environment.PTO_SUPERVISOR_APPROVER_EMAIL,
      );
    }
    const configured = await validateCurrentSetting(database);
    console.info(
      configured
        ? "El modelo de ausencias y su aprobador quedaron configurados."
        : "El modelo de ausencias quedó listo. Configurá el aprobador de supervisores en /admin/ausencias.",
    );
  } finally {
    await client.close();
  }
}

bootstrap().catch(() => {
  console.error(
    "La inicialización de ausencias falló de forma segura. Revisá la conexión y la cuenta aprobadora.",
  );
  process.exitCode = 1;
});
