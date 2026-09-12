import "server-only";

import { ObjectId } from "mongodb";

import type { PlatformUserDocument } from "@/features/auth/domain/platform-user";
import {
  formatEmployeePreferredDisplayName,
  type EmployeeDocument,
} from "@/features/employees/domain/employee";
import type {
  ProductionTaskEmployee,
  ProductionTaskEmployeePort,
} from "@/features/production-tasks/integrations/production-task-employee-port";
import { getDatabase } from "@/lib/server/mongodb";
import type { EmployeeAssignmentDocument } from "@/features/employees/domain/assignment";
import type { DepartmentDocument } from "@/features/employees/domain/department";

const taskEmployeeProjection = {
  _id: 1,
  employeeCode: 1,
  firstSurname: 1,
  givenNames: 1,
  platformUserId: 1,
  preferredName: 1,
  secondSurname: 1,
} as const;

async function toTaskEmployee(
  employee: EmployeeDocument,
): Promise<ProductionTaskEmployee | null> {
  const database = await getDatabase();
  const platformUser = await database
    .collection<PlatformUserDocument>("platform_users")
    .findOne(
      {
        _id: employee.platformUserId,
        status: { $in: ["active", "invited"] },
      },
      { projection: { normalizedEmail: 1, role: 1, status: 1 } },
    );

  if (!platformUser) return null;

  return {
    displayName: formatEmployeePreferredDisplayName(employee),
    email: platformUser.normalizedEmail,
    employeeCode: employee.employeeCode ?? null,
    employeeId: employee._id.toHexString(),
    platformRole: platformUser.role,
    platformUserId: platformUser._id.toHexString(),
  };
}

export const productionTaskEmployeeAdapter: ProductionTaskEmployeePort = {
  async listEmployeeLabels(employeeIds) {
    if (!employeeIds.length) return [];
    const database = await getDatabase();
    const employees = await database
      .collection<EmployeeDocument>("employees")
      .find(
        { _id: { $in: [...new Set(employeeIds)].map((id) => new ObjectId(id)) } },
        { projection: taskEmployeeProjection },
      )
      .toArray();
    return employees.map((employee) => ({
      id: employee._id.toHexString(),
      displayName: formatEmployeePreferredDisplayName(employee),
      employeeCode: employee.employeeCode ?? null,
    }));
  },
  async isProductionEmployee(platformUserId, onDate) {
    const database = await getDatabase();
    const employee = await database
      .collection<EmployeeDocument>("employees")
      .findOne(
        { platformUserId: new ObjectId(platformUserId), employmentStatus: "active" },
        { projection: { _id: 1 } },
      );
    if (!employee) return false;
    const assignment = await database
      .collection<EmployeeAssignmentDocument>("employee_assignments")
      .findOne(
        {
          employeeId: employee._id,
          effectiveFrom: { $lte: onDate },
          $or: [{ effectiveTo: null }, { effectiveTo: { $gte: onDate } }],
        },
        { sort: { effectiveFrom: -1 }, projection: { departmentId: 1 } },
      );
    if (!assignment) return false;
    return Boolean(
      await database.collection<DepartmentDocument>("departments").findOne(
        {
          _id: assignment.departmentId,
          status: "active",
          normalizedName: "produccion",
        },
        { projection: { _id: 1 } },
      ),
    );
  },
  async findActiveEmployeeByPlatformUserId(platformUserId) {
    const database = await getDatabase();
    const employee = await database.collection<EmployeeDocument>("employees").findOne(
      {
        employmentStatus: "active",
        platformUserId: new ObjectId(platformUserId),
      },
      { projection: taskEmployeeProjection },
    );

    return employee ? toTaskEmployee(employee) : null;
  },

  async listActiveEmployees() {
    const database = await getDatabase();
    const employees = await database
      .collection<EmployeeDocument>("employees")
      .find({ employmentStatus: "active" }, { projection: taskEmployeeProjection })
      .sort({ firstSurname: 1, secondSurname: 1, givenNames: 1 })
      .toArray();
    const platformUsers = await database
      .collection<PlatformUserDocument>("platform_users")
      .find(
        {
          _id: { $in: employees.map((employee) => employee.platformUserId) },
          status: { $in: ["active", "invited"] },
        },
        { projection: { normalizedEmail: 1, role: 1, status: 1 } },
      )
      .toArray();
    const platformUserById = new Map(
      platformUsers.map((platformUser) => [
        platformUser._id.toHexString(),
        platformUser,
      ]),
    );

    return employees.flatMap((employee): ProductionTaskEmployee[] => {
      const platformUser = platformUserById.get(employee.platformUserId.toHexString());
      return platformUser
        ? [
            {
              displayName: formatEmployeePreferredDisplayName(employee),
              email: platformUser.normalizedEmail,
              employeeCode: employee.employeeCode ?? null,
              employeeId: employee._id.toHexString(),
              platformRole: platformUser.role,
              platformUserId: platformUser._id.toHexString(),
            },
          ]
        : [];
    });
  },
};
