import "server-only";

import type { DevelopmentCalendarIntegration } from "@/features/development/integrations/development-calendar-port";
import { localDateTimeToUtc } from "@/features/calendar/domain/calendar-utils";
import {
  createInternalOneOnOneCalendarEvent,
  findInternalOneOnOneCalendarEventSummaryForAdministrator,
  type CalendarActor,
} from "@/features/calendar/server/calendar-event-repository";

function toAdministratorActor(platformUserId: string): CalendarActor {
  return { departmentId: null, platformUserId, role: "administrator" };
}

export const developmentCalendarIntegration: DevelopmentCalendarIntegration = {
  async createOneOnOneEvent({
    actorPlatformUserId,
    endDateTime,
    session,
    startDateTime,
    targetEmployeeId,
  }) {
    const event = await createInternalOneOnOneCalendarEvent({
      actor: toAdministratorActor(actorPlatformUserId),
      endsAt: localDateTimeToUtc(endDateTime),
      session,
      startsAt: localDateTimeToUtc(startDateTime),
      targetEmployeeId,
    });
    return event.id;
  },

  findOneOnOneEventForAdministrator({ actorPlatformUserId, eventId }) {
    return findInternalOneOnOneCalendarEventSummaryForAdministrator({
      actor: toAdministratorActor(actorPlatformUserId),
      eventId,
    });
  },
};
