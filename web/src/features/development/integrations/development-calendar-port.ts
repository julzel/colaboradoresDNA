import type { ClientSession } from "mongodb";

import type { DevelopmentCalendarEventSummary } from "@/features/development/view-models/development-view";

export interface DevelopmentCalendarIntegration {
  createOneOnOneEvent(input: {
    actorPlatformUserId: string;
    endDateTime: string;
    session: ClientSession;
    startDateTime: string;
    targetEmployeeId: string;
  }): Promise<string>;
  findOneOnOneEventForAdministrator(input: {
    actorPlatformUserId: string;
    eventId: string;
  }): Promise<DevelopmentCalendarEventSummary | null>;
}
