import "server-only";
import { listLeaveNotifications } from "../server/leave-notifications";

import type { CalendarPtoIntegration } from "@/features/calendar/integrations/calendar-pto-port";
import {
  formatPtoDays,
  ptoCategoryLabels,
  ptoStatusLabels,
} from "@/features/pto/domain/pto";
import {
  getApprovedPtoCalendarDetail,
  listVisibleApprovedPtoForCalendar,
} from "@/features/pto/server/pto-service";

export const calendarPtoIntegration: CalendarPtoIntegration = {
  async getVisibleApprovedAbsenceDetail(requestId) {
    const request = await getApprovedPtoCalendarDetail(requestId);
    if (!request) return null;

    return {
      canViewRequest: request.canViewRequest,
      category: request.category,
      categoryLabel: ptoCategoryLabels[request.category],
      durationLabel: formatPtoDays(request.durationUnits),
      endDate: request.endDate,
      id: request.id,
      requesterName: request.requesterName,
      startDate: request.startDate,
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
