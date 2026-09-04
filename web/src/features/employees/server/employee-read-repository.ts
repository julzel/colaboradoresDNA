import "server-only";

import { ObjectId, type Filter } from "mongodb";

import type {
  PlatformRole,
  PlatformUserDocument,
  PlatformUserStatus,
} from "@/features/auth/domain/platform-user";
import type { EmployeeAssignmentDocument } from "@/features/employees/domain/assignment";
import type { DepartmentDocument } from "@/features/employees/domain/department";
import type { EmployeeDirectoryQuery } from "@/features/employees/domain/employee-directory-query";
import {
  formatEmployeeBirthday,
  formatEmployeeDisplayName,
  formatEmployeePreferredDisplayName,
  getDisplayNameInitials,
  getEmployeeInitials,
  maskIdentification,
  type EmployeeDocument,
  type EmploymentStatus,
} from "@/features/employees/domain/employee";
import type { EmployeeScheduleDocument } from "@/features/employees/domain/schedule";
import { objectIdStringSchema } from "@/features/employees/domain/shared";
import { listEmployeeAssignmentHistory } from "@/features/employees/server/assignment-repository";
import { listEmployeeScheduleHistory } from "@/features/employees/server/schedule-repository";
import type {
  EmployeeDetail,
  EmployeeDirectoryItem,
  EmployeeDirectoryResult,
  EmployeeManagerOption,
  EmployeeSelfServiceProfileDetail,
} from "@/features/employees/view-models/employee-view";
import { getDatabase } from "@/lib/server/mongodb";

const pageSize = 20;

type DirectoryAggregationRow = {
  _id: ObjectId;
  accessStatus: PlatformUserStatus;
  clerkUserId: string | null;
  departmentId: ObjectId | null;
  departmentName: string | null;
  displayName: string;
  employeeCode?: string;
  employmentStartedOn: string;
  employmentStatus: EmploymentStatus;
  managerName: string | null;
  platformRole: PlatformRole;
  positionTitle: string | null;
};

export type EmployeeDirectoryRepositoryResult = Omit<
  EmployeeDirectoryResult,
  "items"
> & {
  items: Array<
    Omit<EmployeeDirectoryItem, "profileImageUrl"> & {
      clerkUserId: string | null;
    }
  >;
};

function todayInCostaRica() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Costa_Rica",
    year: "numeric",
  }).format(new Date());
}

export async function getEmployeeSelfServiceProfileDetail(
  platformUserId: string,
): Promise<EmployeeSelfServiceProfileDetail | null> {
  objectIdStringSchema.parse(platformUserId);
  const database = await getDatabase();
  const employee = await database.collection<EmployeeDocument>("employees").findOne({
    platformUserId: new ObjectId(platformUserId),
  });

  if (!employee) return null;

  const today = todayInCostaRica();
  const [access, assignment, schedule] = await Promise.all([
    database
      .collection<PlatformUserDocument>("platform_users")
      .findOne({ _id: employee.platformUserId }),
    database.collection<EmployeeAssignmentDocument>("employee_assignments").findOne(
      {
        effectiveFrom: { $lte: today },
        employeeId: employee._id,
        $or: [{ effectiveTo: null }, { effectiveTo: { $gte: today } }],
      },
      { sort: { effectiveFrom: -1 } },
    ),
    database.collection<EmployeeScheduleDocument>("employee_schedules").findOne(
      {
        effectiveFrom: { $lte: today },
        employeeId: employee._id,
        version: { $ne: 2 },
        $or: [{ effectiveTo: null }, { effectiveTo: { $gte: today } }],
      } as Filter<EmployeeScheduleDocument>,
      { sort: { effectiveFrom: -1 } },
    ),
  ]);

  if (!access) return null;

  const [department, manager] = await Promise.all([
    assignment
      ? database
          .collection<DepartmentDocument>("departments")
          .findOne({ _id: assignment.departmentId })
      : null,
    assignment?.managerEmployeeId
      ? database
          .collection<EmployeeDocument>("employees")
          .findOne({ _id: assignment.managerEmployeeId })
      : null,
  ]);
  const canonicalDisplayName = formatEmployeeDisplayName(employee);
  const displayName = formatEmployeePreferredDisplayName(employee);

  return {
    access: {
      email: access.normalizedEmail,
      role: access.role,
      status: access.status,
    },
    currentAssignment: assignment
      ? {
          departmentName: department?.name ?? "Departamento desconocido",
          managerName: manager ? formatEmployeePreferredDisplayName(manager) : null,
          positionTitle: assignment.positionTitle,
        }
      : null,
    currentSchedule: schedule ? { days: schedule.days } : null,
    employee: {
      birthday: formatEmployeeBirthday(employee),
      canonicalDisplayName,
      displayName,
      employeeCode: employee.employeeCode ?? null,
      employmentEndedOn: employee.employmentEndedOn,
      employmentStartedOn: employee.employmentStartedOn,
      employmentStatus: employee.employmentStatus,
      identification: {
        maskedValue: maskIdentification(employee.identification),
        type: employee.identification.type,
      },
      initials: getDisplayNameInitials(displayName),
      phoneDisplayValue: employee.phoneNumber?.displayValue ?? null,
      preferredName: employee.preferredName ?? null,
      shareBirthdayOnCalendar: employee.shareBirthdayOnCalendar,
    },
  };
}

export async function listEmployeeDirectoryForAdministration(
  query: EmployeeDirectoryQuery,
  options: { paginate?: boolean } = {},
): Promise<EmployeeDirectoryRepositoryResult> {
  const database = await getDatabase();
  const today = todayInCostaRica();
  const match: Record<string, unknown> = {};

  if (query.employment) match.employmentStatus = query.employment;
  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    match.$or = [
      { givenNames: { $regex: escaped, $options: "i" } },
      { firstSurname: { $regex: escaped, $options: "i" } },
      { secondSurname: { $regex: escaped, $options: "i" } },
    ];
  }

  const sort =
    query.sort === "name_desc"
      ? { displayName: -1 as const }
      : query.sort === "start_desc"
        ? { employmentStartedOn: -1 as const, displayName: 1 as const }
        : query.sort === "start_asc"
          ? { employmentStartedOn: 1 as const, displayName: 1 as const }
          : { displayName: 1 as const };

  const rows = await database
    .collection("employees")
    .aggregate<DirectoryAggregationRow>([
      { $match: match },
      {
        $addFields: {
          displayName: {
            $trim: {
              input: {
                $concat: [
                  "$givenNames",
                  " ",
                  "$firstSurname",
                  " ",
                  { $ifNull: ["$secondSurname", ""] },
                ],
              },
            },
          },
        },
      },
      {
        $lookup: {
          as: "access",
          foreignField: "_id",
          from: "platform_users",
          localField: "platformUserId",
        },
      },
      { $unwind: "$access" },
      ...(query.access ? [{ $match: { "access.status": query.access } }] : []),
      ...(query.role ? [{ $match: { "access.role": query.role } }] : []),
      {
        $lookup: {
          as: "assignment",
          from: "employee_assignments",
          let: { employeeId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$employeeId", "$$employeeId"] },
                    { $lte: ["$effectiveFrom", today] },
                    {
                      $or: [
                        { $eq: ["$effectiveTo", null] },
                        { $gte: ["$effectiveTo", today] },
                      ],
                    },
                  ],
                },
              },
            },
            { $sort: { effectiveFrom: -1 } },
            { $limit: 1 },
          ],
        },
      },
      { $unwind: { path: "$assignment", preserveNullAndEmptyArrays: true } },
      ...(query.department
        ? [{ $match: { "assignment.departmentId": new ObjectId(query.department) } }]
        : []),
      {
        $lookup: {
          as: "department",
          foreignField: "_id",
          from: "departments",
          localField: "assignment.departmentId",
        },
      },
      {
        $lookup: {
          as: "manager",
          foreignField: "_id",
          from: "employees",
          localField: "assignment.managerEmployeeId",
        },
      },
      {
        $project: {
          accessStatus: "$access.status",
          clerkUserId: "$access.clerkUserId",
          departmentId: "$assignment.departmentId",
          departmentName: { $arrayElemAt: ["$department.name", 0] },
          displayName: 1,
          employeeCode: 1,
          employmentStartedOn: 1,
          employmentStatus: 1,
          managerName: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: [{ $arrayElemAt: ["$manager.givenNames", 0] }, ""] },
                  " ",
                  { $ifNull: [{ $arrayElemAt: ["$manager.firstSurname", 0] }, ""] },
                ],
              },
            },
          },
          platformRole: "$access.role",
          positionTitle: "$assignment.positionTitle",
        },
      },
      { $sort: sort },
    ])
    .toArray();

  const total = rows.length;
  const items = rows.map((row) => ({
    accessStatus: row.accessStatus,
    clerkUserId: row.clerkUserId ?? null,
    departmentName: row.departmentName || null,
    displayName: row.displayName,
    employeeCode: row.employeeCode ?? null,
    employmentStartedOn: row.employmentStartedOn,
    employmentStatus: row.employmentStatus,
    id: row._id.toHexString(),
    managerName: row.managerName || null,
    platformRole: row.platformRole,
    positionTitle: row.positionTitle || null,
  }));

  if (options.paginate === false) {
    return {
      items,
      page: 1,
      pageCount: 1,
      total,
    };
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(query.page, pageCount);

  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageCount,
    total,
  };
}

export async function listEligibleManagerOptions(
  excludedEmployeeId?: string,
): Promise<EmployeeManagerOption[]> {
  const database = await getDatabase();
  const documents = await database
    .collection("employees")
    .aggregate<{ _id: ObjectId; displayName: string }>([
      {
        $match: {
          employmentStatus: "active",
          ...(excludedEmployeeId
            ? { _id: { $ne: new ObjectId(excludedEmployeeId) } }
            : {}),
        },
      },
      {
        $lookup: {
          as: "access",
          foreignField: "_id",
          from: "platform_users",
          localField: "platformUserId",
        },
      },
      {
        $match: {
          "access.role": { $in: ["administrator", "supervisor"] },
          "access.status": "active",
        },
      },
      {
        $project: {
          displayName: {
            $concat: ["$givenNames", " ", "$firstSurname"],
          },
        },
      },
      { $sort: { displayName: 1 } },
    ])
    .toArray();

  return documents.map((document) => ({
    displayName: document.displayName,
    id: document._id.toHexString(),
  }));
}

export async function getEmployeeDetailForAdministration(
  employeeId: string,
): Promise<EmployeeDetail | null> {
  objectIdStringSchema.parse(employeeId);
  const database = await getDatabase();
  const employee = await database
    .collection("employees")
    .findOne({ _id: new ObjectId(employeeId) });

  if (!employee) return null;

  const [access, assignments, schedules, departments, employees] = await Promise.all([
    database.collection("platform_users").findOne({ _id: employee.platformUserId }),
    listEmployeeAssignmentHistory(employeeId),
    listEmployeeScheduleHistory(employeeId),
    database.collection("departments").find({}).toArray(),
    database
      .collection("employees")
      .find({}, { projection: { firstSurname: 1, givenNames: 1 } })
      .toArray(),
  ]);

  if (!access) return null;

  const departmentNames = new Map(
    departments.map((department) => [
      department._id.toHexString(),
      String(department.name),
    ]),
  );
  const employeeNames = new Map(
    employees.map((person) => [
      person._id.toHexString(),
      formatEmployeeDisplayName(person as never),
    ]),
  );
  const currentAssignment =
    assignments.find(
      (assignment) =>
        assignment.effectiveFrom <= todayInCostaRica() &&
        (!assignment.effectiveTo || assignment.effectiveTo >= todayInCostaRica()),
    ) ?? null;
  const currentSchedule =
    schedules.find(
      (schedule) =>
        schedule.effectiveFrom <= todayInCostaRica() &&
        (!schedule.effectiveTo || schedule.effectiveTo >= todayInCostaRica()),
    ) ?? null;

  return {
    access: {
      clerkUserId: access.clerkUserId ?? null,
      email: String(access.normalizedEmail),
      hasInvitationBeenSent: Boolean(
        access.invitation.lastSentAt || access.invitation.clerkInvitationId,
      ),
      invitationStatus: access.invitation.status,
      role: access.role,
      status: access.status,
    },
    assignmentHistory: assignments.map((assignment) => ({
      ...assignment,
      departmentName:
        departmentNames.get(assignment.departmentId) ?? "Departamento desconocido",
      managerName: assignment.managerEmployeeId
        ? (employeeNames.get(assignment.managerEmployeeId) ?? null)
        : null,
    })),
    currentAssignment: currentAssignment
      ? {
          departmentId: currentAssignment.departmentId,
          departmentName:
            departmentNames.get(currentAssignment.departmentId) ??
            "Departamento desconocido",
          managerEmployeeId: currentAssignment.managerEmployeeId,
          managerName: currentAssignment.managerEmployeeId
            ? (employeeNames.get(currentAssignment.managerEmployeeId) ?? null)
            : null,
          positionTitle: currentAssignment.positionTitle,
        }
      : null,
    currentSchedule,
    employee: {
      birthday: formatEmployeeBirthday(employee as never),
      employmentEndedOn: employee.employmentEndedOn,
      employmentStartedOn: employee.employmentStartedOn,
      employmentStatus: employee.employmentStatus,
      employeeCode: employee.employeeCode ?? null,
      firstSurname: employee.firstSurname,
      givenNames: employee.givenNames,
      id: employee._id.toHexString(),
      identification: {
        maskedValue: maskIdentification(employee.identification),
        type: employee.identification.type,
      },
      initials: getEmployeeInitials(employee as never),
      phoneDisplayValue: employee.phoneNumber?.displayValue ?? null,
      preferredName: employee.preferredName ?? null,
      secondSurname: employee.secondSurname,
      shareBirthdayOnCalendar: employee.shareBirthdayOnCalendar,
    },
    scheduleHistory: schedules,
  };
}

export async function revealEmployeeIdentificationValue(employeeId: string) {
  objectIdStringSchema.parse(employeeId);
  const database = await getDatabase();
  const employee = await database
    .collection("employees")
    .findOne(
      { _id: new ObjectId(employeeId) },
      { projection: { "identification.value": 1 } },
    );

  return employee?.identification?.value ?? null;
}
