import "server-only";

import { ObjectId } from "mongodb";

import {
  formatEmployeePreferredDisplayName,
  type EmployeeDocument,
} from "@/features/employees/domain/employee";
import type { SchedulingEmployeeIntegration } from "@/features/scheduling/integrations/scheduling-employee-port";
import { recordEmployeeAudit } from "@/features/employees/server/employee-audit-repository";
import { getDatabase } from "@/lib/server/mongodb";

export const schedulingEmployeeIntegration: SchedulingEmployeeIntegration = {
  async employeeIsActive(employeeId, session) {
    if (!ObjectId.isValid(employeeId)) return false;

    const database = await getDatabase();
    const employee = await database.collection<EmployeeDocument>("employees").findOne(
      { _id: new ObjectId(employeeId), employmentStatus: "active" },
      {
        projection: { _id: 1 },
        ...(session ? { session } : {}),
      },
    );

    return Boolean(employee);
  },

  async findActiveEmployeeIdByPlatformUserId(platformUserId) {
    if (!ObjectId.isValid(platformUserId)) return null;
    const database = await getDatabase();
    const employee = await database.collection<EmployeeDocument>("employees").findOne(
      {
        employmentStatus: "active",
        platformUserId: new ObjectId(platformUserId),
      },
      { projection: { _id: 1 } },
    );

    return employee?._id.toHexString() ?? null;
  },

  async listActiveEmployees() {
    const database = await getDatabase();
    const employees = await database
      .collection<EmployeeDocument>("employees")
      .find(
        { employmentStatus: "active" },
        {
          projection: {
            firstSurname: 1,
            givenNames: 1,
            preferredName: 1,
            secondSurname: 1,
          },
        },
      )
      .sort({ firstSurname: 1, secondSurname: 1, givenNames: 1 })
      .toArray();

    return employees.map((employee) => ({
      displayName: formatEmployeePreferredDisplayName(employee),
      id: employee._id.toHexString(),
    }));
  },

  recordScheduleAudit({ action, actorPlatformUserId, session, targetEmployeeId }) {
    return recordEmployeeAudit({
      action,
      actorPlatformUserId,
      changedFields: ["schedule"],
      session,
      targetEmployeeId,
    });
  },
};
