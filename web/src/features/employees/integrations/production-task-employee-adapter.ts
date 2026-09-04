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
