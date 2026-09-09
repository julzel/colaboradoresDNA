import "server-only";
import { ObjectId, type ClientSession } from "mongodb";
import { getDatabase } from "@/lib/server/mongodb";
import { LeaveConflictError } from "../domain/leave-conflict";
import {
  ptoCategoryLabels,
  normalizePtoCategory,
  ptoStatusLabels,
  type PtoRequestDocument,
} from "../domain/pto";

export async function findLeaveConflicts(
  employeeId: string,
  range: { startDate: string; endDate: string },
  excludeId?: string,
  session?: ClientSession,
) {
  const database = await getDatabase();
  const documents = await database
    .collection<PtoRequestDocument>("pto_requests")
    .find(
      {
        requesterEmployeeId: new ObjectId(employeeId),
        status: { $in: ["draft", "pending", "approved"] },
        startDate: { $lte: range.endDate },
        endDate: { $gte: range.startDate },
        ...(excludeId ? { _id: { $ne: new ObjectId(excludeId) } } : {}),
      },
      session ? { session } : {},
    )
    .sort({ startDate: 1 })
    .limit(20)
    .toArray();
  return documents.map((request) => ({
    id: request._id.toHexString(),
    category: ptoCategoryLabels[normalizePtoCategory(request.category)],
    startDate: request.startDate,
    endDate: request.endDate,
    status: ptoStatusLabels[request.status],
  }));
}

/** Serialize competing writes per employee so two simultaneous requests cannot both pass. */
export async function assertNoLeaveConflict(
  employeeId: string,
  range: { startDate: string; endDate: string },
  session: ClientSession,
  excludeId?: string,
) {
  const database = await getDatabase();
  const lock = await database
    .collection("employees")
    .updateOne(
      { _id: new ObjectId(employeeId) },
      { $inc: { leaveRequestRevision: 1 } },
      { session },
    );
  if (lock.matchedCount !== 1) throw new Error("Employee missing");
  const conflicts = await findLeaveConflicts(employeeId, range, excludeId, session);
  if (conflicts.length) throw new LeaveConflictError(conflicts);
}
