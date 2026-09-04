import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import { z } from "zod";

const environmentSchema = z.object({
  MONGODB_DB: z.string().min(1),
  MONGODB_URI: z.string().url().startsWith("mongodb"),
});

const departments = ["Gerencia", "Nutrición", "Producción", "Servicio al cliente"];

const collectionIndexes = {
  departments: [
    {
      key: { normalizedName: 1 },
      options: { name: "departments_normalized_name_unique", unique: true },
    },
    {
      key: { status: 1, name: 1 },
      options: { name: "departments_directory" },
    },
  ],
  employee_assignments: [
    {
      key: { employeeId: 1, effectiveFrom: -1, effectiveTo: 1 },
      options: { name: "employee_assignments_employee_timeline" },
    },
    {
      key: { departmentId: 1, effectiveFrom: -1, effectiveTo: 1 },
      options: { name: "employee_assignments_department_timeline" },
    },
    {
      key: { managerEmployeeId: 1, effectiveFrom: -1, effectiveTo: 1 },
      options: {
        name: "employee_assignments_manager_timeline",
        partialFilterExpression: { managerEmployeeId: { $type: "objectId" } },
      },
    },
    {
      key: { employeeId: 1 },
      options: {
        name: "employee_assignments_one_open_period",
        partialFilterExpression: { effectiveTo: null },
        unique: true,
      },
    },
  ],
  employee_audit: [
    {
      key: { targetEmployeeId: 1, createdAt: -1 },
      options: { name: "employee_audit_target_timeline" },
    },
    {
      key: { actorPlatformUserId: 1, createdAt: -1 },
      options: { name: "employee_audit_actor_timeline" },
    },
  ],
  employees: [
    {
      key: { employeeCode: 1 },
      options: {
        name: "employees_employee_code_unique",
        partialFilterExpression: { employeeCode: { $type: "string" } },
        unique: true,
      },
    },
    {
      key: { platformUserId: 1 },
      options: { name: "employees_platform_user_unique", unique: true },
    },
    {
      key: {
        "identification.type": 1,
        "identification.normalizedValue": 1,
      },
      options: { name: "employees_identification_unique", unique: true },
    },
    {
      key: {
        employmentStatus: 1,
        firstSurname: 1,
        secondSurname: 1,
        givenNames: 1,
      },
      options: { name: "employees_directory" },
    },
    {
      key: { birthMonth: 1, birthDay: 1, employmentStatus: 1 },
      options: { name: "employees_birthday_calendar" },
    },
  ],
};

function normalizeSearchText(value) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-CR");
}

async function bootstrap() {
  const environment = environmentSchema.parse(process.env);
  const client = new MongoClient(environment.MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
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

    const now = new Date();
    await database.collection("departments").bulkWrite(
      departments.map((name) => ({
        updateOne: {
          filter: { normalizedName: normalizeSearchText(name) },
          update: {
            $setOnInsert: {
              _id: new ObjectId(),
              createdAt: now,
              description: null,
              name,
              normalizedName: normalizeSearchText(name),
              status: "active",
              updatedAt: now,
            },
          },
          upsert: true,
        },
      })),
    );
    await database.collection("employee_timeline_locks").updateOne(
      { _id: "assignment_graph" },
      {
        $setOnInsert: {
          updatedAt: now,
          version: 0,
        },
      },
      { upsert: true },
    );
    await database
      .collection("employees")
      .updateMany(
        { preferredName: { $exists: false } },
        { $set: { preferredName: null } },
      );

    const employeesWithoutCode = await database
      .collection("employees")
      .find(
        { employeeCode: { $exists: false } },
        { projection: { _id: 1 }, sort: { createdAt: 1, _id: 1 } },
      )
      .toArray();
    const existingCodes = await database
      .collection("employees")
      .find({ employeeCode: { $type: "string" } }, { projection: { employeeCode: 1 } })
      .toArray();
    let employeeCodeSequence = existingCodes.reduce((maximum, employee) => {
      const match = /^DNA-(\d+)$/.exec(String(employee.employeeCode));
      return match ? Math.max(maximum, Number(match[1])) : maximum;
    }, 0);

    for (const employee of employeesWithoutCode) {
      employeeCodeSequence += 1;
      await database.collection("employees").updateOne(
        { _id: employee._id, employeeCode: { $exists: false } },
        {
          $set: {
            employeeCode: `DNA-${String(employeeCodeSequence).padStart(4, "0")}`,
          },
        },
      );
    }

    await database.collection("employee_sequences").updateOne(
      { _id: "employee_code" },
      {
        $max: { value: employeeCodeSequence },
        $set: { updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );

    console.info("La inicialización del modelo de colaboradores finalizó.");
  } finally {
    await client.close();
  }
}

bootstrap().catch(() => {
  console.error(
    "La inicialización falló de forma segura. Revisá la configuración y conexión de la base de datos.",
  );
  process.exitCode = 1;
});
