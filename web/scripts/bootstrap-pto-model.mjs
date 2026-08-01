import { MongoClient, ServerApiVersion } from "mongodb";
import { z } from "zod";

const environmentSchema = z.object({
  MONGODB_DB: z.string().min(1),
  MONGODB_URI: z.string().url().startsWith("mongodb"),
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
    {
      key: { status: 1, submittedAt: 1, requesterPlatformUserId: 1 },
      options: { name: "pto_requests_administrator_queue" },
    },
    {
      key: { status: 1, updatedAt: -1 },
      options: { name: "pto_requests_administrator_history" },
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
    console.info("El modelo de ausencias quedó listo.");
  } finally {
    await client.close();
  }
}

bootstrap().catch(() => {
  console.error(
    "La inicialización de ausencias falló de forma segura. Revisá la conexión a la base de datos.",
  );
  process.exitCode = 1;
});
