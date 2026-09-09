import "server-only";
import { listLeaveNotifications } from "../server/leave-notifications";

import type { CalendarPtoIntegration } from "@/features/calendar/integrations/calendar-pto-port";
import {
  formatPtoDays,
  ptoCategoryLabels,
  ptoStatusLabels,
} from "@/features/pto/domain/pto";
import {
  getPtoRequestDetail,
  listVisibleApprovedPtoForCalendar,
} from "@/features/pto/server/pto-service";

export const calendarPtoIntegration: CalendarPtoIntegration = {
  async getVisibleApprovedAbsenceDetail(requestId) {
    const detail = await getPtoRequestDetail(requestId);
    if (!detail || detail.request.status !== "approved") return null;

    return {
      category: detail.request.category,
      categoryLabel: ptoCategoryLabels[detail.request.category],
      durationLabel: formatPtoDays(detail.request.durationUnits),
      endDate: detail.request.endDate,
      id: detail.request.id,
      requesterName: detail.request.requesterName,
      startDate: detail.request.startDate,
      statusLabel: ptoStatusLabels.approved,
    };
  },

  async listUpcomingAbsenceNotifications(platformUserId, limit) {
    return listLeaveNotifications(platformUserId, limit);
  },

  async listVisibleApprovedAbsences(input) {
    const requests = await listVisibleApprovedPtoForCalendar(input);
    return requests.map((request) => ({
      durationLabel: formatPtoDays(request.durationUnits),
      endDate: request.endDate,
      id: request.id,
      requesterName: request.requesterName,
      startDate: request.startDate,
    }));
  },
};
