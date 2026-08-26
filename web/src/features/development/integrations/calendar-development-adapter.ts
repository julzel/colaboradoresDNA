import "server-only";

import type { CalendarDevelopmentIntegration } from "@/features/calendar/integrations/calendar-development-port";
import { developmentObjectIdSchema } from "@/features/development/domain/shared";
import { findOneOnOneByCalendarEventId } from "@/features/development/server/development-read-repository";

export const calendarDevelopmentIntegration: CalendarDevelopmentIntegration = {
  async findLinkedOneOnOne({ actorRole, calendarEventId }) {
    if (
      actorRole !== "administrator" ||
      !developmentObjectIdSchema.safeParse(calendarEventId).success
    ) {
      return null;
    }

    const link = await findOneOnOneByCalendarEventId(calendarEventId);
    return link ? { employeeId: link.employeeId, meetingId: link.meetingId } : null;
  },
};
