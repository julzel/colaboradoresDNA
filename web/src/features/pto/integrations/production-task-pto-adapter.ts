import "server-only";

import { ObjectId } from "mongodb";

import type { ProductionTaskAvailabilityPort } from "@/features/production-tasks/integrations/production-task-availability-port";
import type { PtoRequestDocument } from "@/features/pto/domain/pto";
import { getDatabase } from "@/lib/server/mongodb";

export const productionTaskPtoAdapter: Pick<ProductionTaskAvailabilityPort, "check"> = {
  async check({ employeeId, workDate }) {
    const database = await getDatabase();
    const request = await database
      .collection<PtoRequestDocument>("pto_requests")
      .findOne(
        {
          endDate: { $gte: workDate },
          requesterEmployeeId: new ObjectId(employeeId),
          startDate: { $lte: workDate },
          status: "approved",
        },
        { projection: { _id: 1 } },
      );
    return { hasApprovedLeave: !!request, scheduleStatus: "unknown" };
  },
};
