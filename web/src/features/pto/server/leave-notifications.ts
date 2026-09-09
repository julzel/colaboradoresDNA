import "server-only";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/server/mongodb";
import { findPlatformUserById } from "@/features/auth/server/platform-user-repository";
import type { DashboardNotification } from "@/features/dashboard/domain/dashboard-notification";
import {
  ptoCategoryLabels,
  normalizePtoCategory,
  ptoStatusLabels,
  type PtoRequestDocument,
} from "../domain/pto";

/** Status history is committed atomically with each transition: no lost notification writes. */
export async function listLeaveNotifications(
  platformUserId: string,
  limit = 100,
): Promise<Array<Omit<DashboardNotification, "isUnread">>> {
  const user = await findPlatformUserById(platformUserId);
  if (!user || user.status !== "active") return [];
  const database = await getDatabase();
  const id = new ObjectId(platformUserId);
  const requests = await database
    .collection<PtoRequestDocument>("pto_requests")
    .find({
      ...(user.role === "administrator"
        ? {}
        : {
            $or: [
              { requesterPlatformUserId: id },
              { assignedApproverPlatformUserId: id },
            ],
          }),
      status: { $ne: "draft" },
    })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray();
  return requests
    .flatMap((request) =>
      request.statusHistory.flatMap((entry, index) => {
        const own = request.requesterPlatformUserId.equals(id);
        const submission =
          entry.to === "pending" &&
          !own &&
          (user.role === "administrator" ||
            request.assignedApproverPlatformUserId?.equals(id));
        const update =
          own &&
          !entry.actorPlatformUserId.equals(id) &&
          ["approved", "denied", "cancelled"].includes(entry.to);
        if (!submission && !update) return [];
        const requestId = request._id.toHexString();
        return [
          {
            allDay: true,
            endDate: request.endDate,
            eventType: null,
            href: `/ausencias/${requestId}`,
            id: requestId,
            key: `leave:${requestId}:${index}:${entry.to}`,
            kind: "pto" as const,
            label: submission
              ? "Nueva solicitud de ausencia"
              : `Ausencia ${ptoStatusLabels[entry.to].toLocaleLowerCase("es")}`,
            startDate: request.startDate,
            startsAt: entry.occurredAt.toISOString(),
            title: ptoCategoryLabels[normalizePtoCategory(request.category)],
          },
        ];
      }),
    )
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
    .slice(0, limit);
}
