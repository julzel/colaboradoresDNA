import type { PlatformRole } from "@/features/auth/domain/platform-user";

export type CalendarDevelopmentLink = {
  employeeId: string;
  meetingId: string;
};

export interface CalendarDevelopmentIntegration {
  findLinkedOneOnOne(input: {
    actorRole: PlatformRole;
    calendarEventId: string;
  }): Promise<CalendarDevelopmentLink | null>;
}
