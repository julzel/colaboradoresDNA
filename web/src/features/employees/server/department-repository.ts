import "server-only";

import { MongoServerError, ObjectId, type Collection, type Filter } from "mongodb";

import {
  departmentInputSchema,
  toDepartment,
  type Department,
  type DepartmentDocument,
  type DepartmentInput,
} from "@/features/employees/domain/department";
import { EmployeeDomainError } from "@/features/employees/domain/errors";
import { ensureEmployeeDomainIndexes } from "@/features/employees/server/employee-indexes";
import { getDatabase } from "@/lib/server/mongodb";

const initialDepartments = [
  { name: "Gerencia" },
  { name: "Nutrición" },
  { name: "Producción" },
  { name: "Servicio al cliente" },
] as const;

async function getDepartmentsCollection(): Promise<Collection<DepartmentDocument>> {
  const database = await getDatabase();
  return database.collection<DepartmentDocument>("departments");
}

export async function createDepartment(input: DepartmentInput): Promise<Department> {
  const department = departmentInputSchema.parse(input);
  await ensureEmployeeDomainIndexes();
  const collection = await getDepartmentsCollection();
  const now = new Date();
  const document: DepartmentDocument = {
    _id: new ObjectId(),
    createdAt: now,
    description: department.description,
    name: department.name,
    normalizedName: department.normalizedName,
    status: department.status,
    updatedAt: now,
  };

  try {
    await collection.insertOne(document);
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new EmployeeDomainError("department_name_exists");
    }

    throw error;
  }

  return toDepartment(document);
}

export async function findDepartmentById(id: string): Promise<Department | null> {
  await ensureEmployeeDomainIndexes();
  const collection = await getDepartmentsCollection();
  const document = await collection.findOne({ _id: new ObjectId(id) });
  return document ? toDepartment(document) : null;
}

export async function listDepartments({
  includeInactive = false,
}: {
  includeInactive?: boolean;
} = {}): Promise<Department[]> {
  await ensureEmployeeDomainIndexes();
  const collection = await getDepartmentsCollection();
  const filter: Filter<DepartmentDocument> = includeInactive
    ? {}
    : { status: "active" };
  const documents = await collection.find(filter).sort({ name: 1 }).toArray();

  return documents.map(toDepartment);
}

export async function setDepartmentStatus({
  id,
  status,
}: {
  id: string;
  status: DepartmentDocument["status"];
}) {
  await ensureEmployeeDomainIndexes();
  const collection = await getDepartmentsCollection();
  const document = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { status, updatedAt: new Date() } },
    { returnDocument: "after" },
  );

  return document ? toDepartment(document) : null;
}

export async function updateDepartment({
  id,
  input,
}: {
  id: string;
  input: DepartmentInput;
}) {
  const department = departmentInputSchema.parse(input);
  await ensureEmployeeDomainIndexes();
  const collection = await getDepartmentsCollection();

  try {
    const document = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          description: department.description,
          name: department.name,
          normalizedName: department.normalizedName,
          status: department.status,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );

    return document ? toDepartment(document) : null;
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new EmployeeDomainError("department_name_exists");
    }

    throw error;
  }
}

export async function seedInitialDepartments() {
  const results: Department[] = [];

  for (const seed of initialDepartments) {
    const parsed = departmentInputSchema.parse(seed);
    await ensureEmployeeDomainIndexes();
    const collection = await getDepartmentsCollection();
    const now = new Date();
    const document = await collection.findOneAndUpdate(
      { normalizedName: parsed.normalizedName },
      {
        $setOnInsert: {
          _id: new ObjectId(),
          createdAt: now,
          description: parsed.description,
          name: parsed.name,
          normalizedName: parsed.normalizedName,
          status: "active",
          updatedAt: now,
        },
      },
      { returnDocument: "after", upsert: true },
    );

    if (document) {
      results.push(toDepartment(document));
    }
  }

  return results;
}
