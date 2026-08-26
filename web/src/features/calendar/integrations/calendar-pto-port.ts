import type { PlatformRole } from "@/features/auth/domain/platform-user";
import type { CalendarPtoQuickDetail } from "@/features/calendar/view-models/calendar-pto-view";

export type CalendarPtoEntry = {
  durationLabel: string;
  endDate: string;
  id: string;
  requesterName: string;
  startDate: string;
};

export type CalendarPtoNotification = {
  categoryLabel: string;
  endDate: string;
  id: string;
  startDate: string;
};

export interface CalendarPtoIntegration {
  getVisibleApprovedAbsenceDetail(
    requestId: string,
  ): Promise<CalendarPtoQuickDetail | null>;
  listUpcomingAbsenceNotifications(
    platformUserId: string,
    limit: number,
  ): Promise<CalendarPtoNotification[]>;
  listVisibleApprovedAbsences(input: {
    endDate: string;
    platformUserId: string;
    role: PlatformRole;
    startDate: string;
  }): Promise<CalendarPtoEntry[]>;
}
