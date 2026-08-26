import "server-only";

import type { DevelopmentDirectory } from "@/features/development/domain/development-directory";
import {
  oneOnOneDraftInputSchema,
  oneOnOneFinalizationInputSchema,
  type NormalizedOneOnOneEditorInput,
} from "@/features/development/domain/one-on-one";
import {
  DevelopmentDomainError,
  developmentObjectIdSchema,
} from "@/features/development/domain/shared";
import { developmentCalendarIntegration } from "@/features/calendar/integrations/development-calendar-adapter";
import { parseEmployeeDirectoryQuery } from "@/features/employees/domain/employee-directory-query";
import { listEmployeeDirectoryForAdministration } from "@/features/employees/server/employee-read-repository";
import {
  findDevelopmentEmployeeById,
  findDevelopmentEmployeeIdentityById,
} from "@/features/development/server/development-employee-read-repository";
import {
  createOneOnOneRecord,
  recordOneOnOneViewed,
  setOneOnOneActionStatus,
  updateOneOnOneDraft,
} from "@/features/development/server/development-repository";
import {
  findOneOnOneDetail,
  getDevelopmentRecordSummary,
  listDevelopmentRecordSummaries,
  listDevelopmentGoalSummaries,
  listOneOnOneTimelineSummaries,
  listSkillAssessmentSummaries,
  todayInCostaRica,
} from "@/features/development/server/development-read-repository";
import {
  requireDevelopmentAdministrator,
  requireOwnDevelopmentSubject,
} from "@/features/development/server/development-policy";

type OneOnOneWriteIntent = "draft" | "finalized";

function assertEmployeeId(employeeId: string) {
  if (!developmentObjectIdSchema.safeParse(employeeId).success) {
    throw new DevelopmentDomainError("employee_not_found");
  }
}

function assertMeetingId(meetingId: string) {
  if (!developmentObjectIdSchema.safeParse(meetingId).success) {
    throw new DevelopmentDomainError("record_not_found");
  }
}

export async function getDevelopmentDirectoryForAdministration(): Promise<DevelopmentDirectory> {
  await requireDevelopmentAdministrator("list");
  const directory = await listEmployeeDirectoryForAdministration(
    parseEmployeeDirectoryQuery({}),
    { paginate: false },
  );
  const summaries = await listDevelopmentRecordSummaries(
    directory.items.map((employee) => employee.id),
  );
  const summaryByEmployee = new Map(
    summaries.map((summary) => [summary.employeeId, summary]),
  );

  return {
    items: directory.items.map((employee) => {
      const summary = summaryByEmployee.get(employee.id);
      if (!summary) throw new DevelopmentDomainError("employee_not_found");
      return {
        ...summary,
        departmentName: employee.departmentName,
        displayName: employee.displayName,
        employmentStatus: employee.employmentStatus,
        positionTitle: employee.positionTitle,
      };
    }),
    today: todayInCostaRica(),
  };
}

async function getSafeDevelopmentRecord({
  employeeId,
  sharedOnly,
}: {
  employeeId: string;
  sharedOnly: boolean;
}) {
  const employee = await findDevelopmentEmployeeById(employeeId);
  if (!employee) {
    throw new DevelopmentDomainError("employee_not_found");
  }

  const [summary, oneOnOnes, goals, skillAssessments] = await Promise.all([
    getDevelopmentRecordSummary(employeeId),
    listOneOnOneTimelineSummaries({ employeeId, sharedOnly }),
    listDevelopmentGoalSummaries({ employeeId }),
    listSkillAssessmentSummaries({ employeeId }),
  ]);

  return {
    goals,
    oneOnOnes,
    skillAssessments,
    summary,
  };
}

export async function getDevelopmentRecordForAdministration(employeeId: string) {
  assertEmployeeId(employeeId);
  await requireDevelopmentAdministrator("read_shared");
  const employee = await findDevelopmentEmployeeIdentityById(employeeId);
  if (!employee) throw new DevelopmentDomainError("employee_not_found");
  const [summary, oneOnOnes] = await Promise.all([
    getDevelopmentRecordSummary(employeeId),
    listOneOnOneTimelineSummaries({ employeeId, sharedOnly: false }),
  ]);
  return { employee, oneOnOnes, summary, today: todayInCostaRica() };
}

export async function getDevelopmentSummaryForAdministration(employeeId: string) {
  assertEmployeeId(employeeId);
  await requireDevelopmentAdministrator("read_shared");
  const employee = await findDevelopmentEmployeeIdentityById(employeeId);
  if (!employee) throw new DevelopmentDomainError("employee_not_found");

  return {
    employee,
    summary: await getDevelopmentRecordSummary(employeeId),
    today: todayInCostaRica(),
  };
}

export async function getOneOnOneFormContextForAdministration(employeeId: string) {
  assertEmployeeId(employeeId);
  await requireDevelopmentAdministrator("write");
  const employee = await findDevelopmentEmployeeIdentityById(employeeId);
  if (!employee) throw new DevelopmentDomainError("employee_not_found");
  return { employee, today: todayInCostaRica() };
}

function validateOneOnOneRecord(
  input: NormalizedOneOnOneEditorInput,
  intent: OneOnOneWriteIntent,
) {
  const schema =
    intent === "finalized" ? oneOnOneFinalizationInputSchema : oneOnOneDraftInputSchema;
  return schema.parse(input.record);
}

function getCalendarEventWriter({
  actorPlatformUserId,
  employeeId,
  schedule,
}: {
  actorPlatformUserId: string;
  employeeId: string;
  schedule: NormalizedOneOnOneEditorInput["calendarSchedule"];
}) {
  if (!schedule) return null;

  return async (
    session: Parameters<
      typeof developmentCalendarIntegration.createOneOnOneEvent
    >[0]["session"],
  ) => {
    return developmentCalendarIntegration.createOneOnOneEvent({
      actorPlatformUserId,
      endDateTime: schedule.endDateTime,
      session,
      startDateTime: schedule.startDateTime,
      targetEmployeeId: employeeId,
    });
  };
}

export async function createOneOnOneForAdministration({
  employeeId,
  input,
  intent,
}: {
  employeeId: string;
  input: NormalizedOneOnOneEditorInput;
  intent: OneOnOneWriteIntent;
}) {
  assertEmployeeId(employeeId);
  const actor = await requireDevelopmentAdministrator(
    intent === "finalized" ? "finalize" : "write",
  );
  const employee = await findDevelopmentEmployeeIdentityById(employeeId);
  if (!employee || employee.employmentStatus !== "active") {
    throw new DevelopmentDomainError("employee_not_found");
  }
  const record = validateOneOnOneRecord(input, intent);

  return createOneOnOneRecord({
    actorPlatformUserId: actor.platformUser.id,
    createCalendarEvent: getCalendarEventWriter({
      actorPlatformUserId: actor.platformUser.id,
      employeeId,
      schedule: input.calendarSchedule,
    }),
    employeeId,
    input: record,
    status: intent,
  });
}

export async function updateOneOnOneForAdministration({
  employeeId,
  expectedVersion,
  input,
  intent,
  meetingId,
}: {
  employeeId: string;
  expectedVersion: number;
  input: NormalizedOneOnOneEditorInput;
  intent: OneOnOneWriteIntent;
  meetingId: string;
}) {
  assertEmployeeId(employeeId);
  assertMeetingId(meetingId);
  const actor = await requireDevelopmentAdministrator(
    intent === "finalized" ? "finalize" : "write",
  );
  const employee = await findDevelopmentEmployeeIdentityById(employeeId);
  if (!employee || employee.employmentStatus !== "active") {
    throw new DevelopmentDomainError("employee_not_found");
  }
  const record = validateOneOnOneRecord(input, intent);

  return updateOneOnOneDraft({
    actorPlatformUserId: actor.platformUser.id,
    createCalendarEvent: getCalendarEventWriter({
      actorPlatformUserId: actor.platformUser.id,
      employeeId,
      schedule: input.calendarSchedule,
    }),
    employeeId,
    expectedVersion,
    input: record,
    meetingId,
    status: intent,
  });
}

export async function getOneOnOneForAdministration({
  employeeId,
  meetingId,
}: {
  employeeId: string;
  meetingId: string;
}) {
  assertEmployeeId(employeeId);
  assertMeetingId(meetingId);
  const actor = await requireDevelopmentAdministrator("read_narrative");
  const [employee, meeting] = await Promise.all([
    findDevelopmentEmployeeIdentityById(employeeId),
    findOneOnOneDetail({ employeeId, meetingId }),
  ]);
  if (!employee || !meeting) throw new DevelopmentDomainError("record_not_found");

  // Reads fail closed: the narrative is not returned if content-free read audit fails.
  await recordOneOnOneViewed({
    actorPlatformUserId: actor.platformUser.id,
    employeeId,
    meetingId,
  });
  const calendarEvent = meeting.calendarEventId
    ? await developmentCalendarIntegration.findOneOnOneEventForAdministrator({
        actorPlatformUserId: actor.platformUser.id,
        eventId: meeting.calendarEventId,
      })
    : null;

  return { calendarEvent, employee, meeting };
}

export async function updateOneOnOneActionForAdministration({
  actionId,
  employeeId,
  expectedVersion,
  meetingId,
  status,
}: {
  actionId: string;
  employeeId: string;
  expectedVersion: number;
  meetingId: string;
  status: "completed" | "open";
}) {
  assertEmployeeId(employeeId);
  assertMeetingId(meetingId);
  const actor = await requireDevelopmentAdministrator("write");
  return setOneOnOneActionStatus({
    actionId,
    actorPlatformUserId: actor.platformUser.id,
    employeeId,
    expectedVersion,
    meetingId,
    status,
  });
}

export async function getOwnFinalizedDevelopmentRecord() {
  const { employeeId } = await requireOwnDevelopmentSubject();
  return getSafeDevelopmentRecord({ employeeId, sharedOnly: true });
}
