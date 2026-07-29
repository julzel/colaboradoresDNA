import "server-only";

import { ObjectId, type ClientSession, type Collection, type Filter } from "mongodb";

import type { PlatformUserDocument } from "@/features/auth/domain/platform-user";
import {
  employeeAssignmentInputSchema,
  toEmployeeAssignment,
  type EmployeeAssignment,
  type EmployeeAssignmentDocument,
  type EmployeeAssignmentInput,
  type NormalizedEmployeeAssignmentInput,
} from "@/features/employees/domain/assignment";
import type { DepartmentDocument } from "@/features/employees/domain/department";
import type { EmployeeDocument } from "@/features/employees/domain/employee";
import { EmployeeDomainError } from "@/features/employees/domain/errors";
import {
  isoCalendarDateSchema,
  objectIdStringSchema,
  previousIsoCalendarDate,
} from "@/features/employees/domain/shared";
import { recordEmployeeAudit } from "@/features/employees/server/employee-audit-repository";
import { ensureEmployeeDomainIndexes } from "@/features/employees/server/employee-indexes";
import { getDatabase, getMongoClient } from "@/lib/server/mongodb";

type TimelineLockDocument = {
  _id: string;
  updatedAt: Date;
  version: number;
};

async function getAssignmentCollections() {
  const database = await getDatabase();

  return {
    assignments:
      database.collection<EmployeeAssignmentDocument>("employee_assignments"),
    departments: database.collection<DepartmentDocument>("departments"),
    employees: database.collection<EmployeeDocument>("employees"),
    locks: database.collection<TimelineLockDocument>("employee_timeline_locks"),
    platformUsers: database.collection<PlatformUserDocument>("platform_users"),
  };
}

function getEffectivePeriodFilter(
  date: string,
): Pick<Filter<EmployeeAssignmentDocument>, "$or" | "effectiveFrom"> {
  return {
    effectiveFrom: { $lte: date },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: date } }],
  };
}

function getOverlapFilter(
  assignment: NormalizedEmployeeAssignmentInput,
  excludedId?: ObjectId,
): Filter<EmployeeAssignmentDocument> {
  return {
    employeeId: new ObjectId(assignment.employeeId),
    ...(excludedId ? { _id: { $ne: excludedId } } : {}),
    ...(assignment.effectiveTo
      ? { effectiveFrom: { $lte: assignment.effectiveTo } }
      : {}),
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: assignment.effectiveFrom } }],
  };
}

async function acquireAssignmentGraphLock(
  locks: Collection<TimelineLockDocument>,
  session: ClientSession,
) {
  await locks.updateOne(
    { _id: "assignment_graph" },
    { $inc: { version: 1 }, $set: { updatedAt: new Date() } },
    { session, upsert: true },
  );
}

async function validateManager({
  assignment,
  assignments,
  employees,
  platformUsers,
  session,
}: {
  assignment: NormalizedEmployeeAssignmentInput;
  assignments: Collection<EmployeeAssignmentDocument>;
  employees: Collection<EmployeeDocument>;
  platformUsers: Collection<PlatformUserDocument>;
  session: ClientSession;
}) {
  if (!assignment.managerEmployeeId) {
    return;
  }

  const managerId = new ObjectId(assignment.managerEmployeeId);
  const manager = await employees.findOne(
    { _id: managerId, employmentStatus: "active" },
    { session },
  );

  if (!manager) {
    throw new EmployeeDomainError("manager_ineligible");
  }

  const managerPlatformUser = await platformUsers.findOne(
    {
      _id: manager.platformUserId,
      role: { $in: ["administrator", "supervisor"] },
      status: "active",
    },
    { session },
  );

  if (!managerPlatformUser) {
    throw new EmployeeDomainError("manager_ineligible");
  }

  const targetEmployeeId = new ObjectId(assignment.employeeId);
  let currentManagerId: ObjectId | null = managerId;
  const visited = new Set<string>();

  while (currentManagerId) {
    const currentId = currentManagerId.toHexString();

    if (currentManagerId.equals(targetEmployeeId)) {
      throw new EmployeeDomainError("manager_cycle");
    }

    if (visited.has(currentId)) {
      throw new EmployeeDomainError("manager_cycle");
    }

    visited.add(currentId);
    const currentAssignment: EmployeeAssignmentDocument | null =
      await assignments.findOne(
        {
          employeeId: currentManagerId,
          ...getEffectivePeriodFilter(assignment.effectiveFrom),
        },
        { session, sort: { effectiveFrom: -1 } },
      );
    currentManagerId = currentAssignment?.managerEmployeeId ?? null;
  }
}

async function insertAssignmentInTransaction({
  input,
  lockAcquired = false,
  session,
}: {
  input: NormalizedEmployeeAssignmentInput;
  lockAcquired?: boolean;
  session: ClientSession;
}) {
  const { assignments, departments, employees, locks, platformUsers } =
    await getAssignmentCollections();

  if (!lockAcquired) {
    await acquireAssignmentGraphLock(locks, session);
  }

  const [employee, department] = await Promise.all([
    employees.findOne({ _id: new ObjectId(input.employeeId) }, { session }),
    departments.findOne(
      { _id: new ObjectId(input.departmentId), status: "active" },
      { session },
    ),
  ]);

  if (!employee) {
    throw new EmployeeDomainError("employee_not_found");
  }

  if (!department) {
    throw new EmployeeDomainError("department_inactive");
  }

  await validateManager({
    assignment: input,
    assignments,
    employees,
    platformUsers,
    session,
  });

  const overlap = await assignments.findOne(getOverlapFilter(input), { session });

  if (overlap) {
    throw new EmployeeDomainError("assignment_overlap");
  }

  const document: EmployeeAssignmentDocument = {
    _id: new ObjectId(),
    createdAt: new Date(),
    createdByPlatformUserId: new ObjectId(input.createdByPlatformUserId),
    departmentId: new ObjectId(input.departmentId),
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo ?? null,
    employeeId: new ObjectId(input.employeeId),
    managerEmployeeId: input.managerEmployeeId
      ? new ObjectId(input.managerEmployeeId)
      : null,
    positionTitle: input.positionTitle,
  };

  await assignments.insertOne(document, { session });
  await recordEmployeeAudit({
    action: "assignment_created",
    actorPlatformUserId: input.createdByPlatformUserId,
    changedFields: ["departmentId", "managerEmployeeId", "positionTitle"],
    session,
    targetEmployeeId: input.employeeId,
  });

  return toEmployeeAssignment(document);
}

export async function createEmployeeAssignmentInSession(
  input: EmployeeAssignmentInput,
  session: ClientSession,
) {
  const assignment = employeeAssignmentInputSchema.parse(input);
  return insertAssignmentInTransaction({ input: assignment, session });
}

export async function createEmployeeAssignment(
  input: EmployeeAssignmentInput,
): Promise<EmployeeAssignment> {
  const assignment = employeeAssignmentInputSchema.parse(input);
  await ensureEmployeeDomainIndexes();
  const client = await getMongoClient();

  return client.withSession(async (session) => {
    let created: EmployeeAssignment | null = null;

    await session.withTransaction(async () => {
      created = await createEmployeeAssignmentInSession(assignment, session);
    });

    if (!created) {
      throw new EmployeeDomainError("employee_not_found");
    }

    return created;
  });
}

export async function replaceEmployeeAssignment(
  input: Omit<EmployeeAssignmentInput, "effectiveTo">,
): Promise<EmployeeAssignment> {
  const assignment = employeeAssignmentInputSchema.parse({
    ...input,
    effectiveTo: null,
  });
  await ensureEmployeeDomainIndexes();
  const client = await getMongoClient();
  const { assignments, locks } = await getAssignmentCollections();

  return client.withSession(async (session) => {
    let created: EmployeeAssignment | null = null;

    await session.withTransaction(async () => {
      await acquireAssignmentGraphLock(locks, session);
      const openAssignment = await assignments.findOne(
        { employeeId: new ObjectId(assignment.employeeId), effectiveTo: null },
        { session },
      );

      if (openAssignment) {
        if (openAssignment.effectiveFrom >= assignment.effectiveFrom) {
          throw new EmployeeDomainError("assignment_overlap");
        }

        await assignments.updateOne(
          { _id: openAssignment._id },
          {
            $set: {
              effectiveTo: previousIsoCalendarDate(assignment.effectiveFrom),
            },
          },
          { session },
        );
        await recordEmployeeAudit({
          action: "assignment_closed",
          actorPlatformUserId: assignment.createdByPlatformUserId,
          changedFields: ["departmentId", "managerEmployeeId", "positionTitle"],
          session,
          targetEmployeeId: assignment.employeeId,
        });
      }

      created = await insertAssignmentInTransaction({
        input: assignment,
        lockAcquired: true,
        session,
      });
    });

    if (!created) {
      throw new EmployeeDomainError("employee_not_found");
    }

    return created;
  });
}

export async function findEffectiveEmployeeAssignment({
  employeeId,
  onDate,
}: {
  employeeId: string;
  onDate: string;
}) {
  objectIdStringSchema.parse(employeeId);
  isoCalendarDateSchema.parse(onDate);
  await ensureEmployeeDomainIndexes();
  const { assignments } = await getAssignmentCollections();
  const document = await assignments.findOne(
    {
      employeeId: new ObjectId(employeeId),
      ...getEffectivePeriodFilter(onDate),
    },
    { sort: { effectiveFrom: -1 } },
  );

  return document ? toEmployeeAssignment(document) : null;
}

export async function listEmployeeAssignmentHistory(employeeId: string) {
  objectIdStringSchema.parse(employeeId);
  await ensureEmployeeDomainIndexes();
  const { assignments } = await getAssignmentCollections();
  const documents = await assignments
    .find({ employeeId: new ObjectId(employeeId) })
    .sort({ effectiveFrom: -1 })
    .toArray();

  return documents.map(toEmployeeAssignment);
}
