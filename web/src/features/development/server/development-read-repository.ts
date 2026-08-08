import "server-only";

import { ObjectId } from "mongodb";

import type { DevelopmentGoalDocument } from "@/features/development/domain/development-goal";
import {
  toDevelopmentProfileSummary,
  type DevelopmentProfileDocument,
  type DevelopmentProfileSummary,
} from "@/features/development/domain/development-profile";
import type {
  OneOnOneDetail,
  OneOnOneDocument,
  OneOnOneTimelineSummary,
} from "@/features/development/domain/one-on-one";
import { oneOnOneNarrativeSchema } from "@/features/development/domain/one-on-one";
import type {
  EmployeeSkillAssessmentDocument,
  SkillAssessmentSummary,
} from "@/features/development/domain/skill";
import { developmentObjectIdSchema } from "@/features/development/domain/shared";
import { getDatabase } from "@/lib/server/mongodb";
import { decryptDevelopmentPayload } from "@/features/development/server/development-encryption";

export const oneOnOneTimelineProjection = {
  _id: 1,
  "amendments._id": 1,
  authorPlatformUserId: 1,
  calendarEventId: 1,
  employeeId: 1,
  finalizedAt: 1,
  occurredOn: 1,
  status: 1,
  updatedAt: 1,
  version: 1,
} as const;

export const oneOnOneNarrativeProjection = {
  _id: 1,
  actionItems: 1,
  "amendments._id": 1,
  authorPlatformUserId: 1,
  calendarEventId: 1,
  employeeId: 1,
  finalizedAt: 1,
  narrative: 1,
  occurredOn: 1,
  status: 1,
  updatedAt: 1,
  version: 1,
} as const;

export const developmentGoalSummaryProjection = {
  _id: 1,
  completedAt: 1,
  employeeId: 1,
  linkedSkillIds: 1,
  originOneOnOneId: 1,
  startDate: 1,
  status: 1,
  targetDate: 1,
  updatedAt: 1,
  version: 1,
} as const;

export const skillAssessmentSummaryProjection = {
  _id: 1,
  assessedAt: 1,
  assessedByPlatformUserId: 1,
  employeeId: 1,
  level: 1,
  skillId: 1,
  version: 1,
} as const;

const developmentProfileSummaryProjection = {
  _id: 1,
  archivedAt: 1,
  employeeId: 1,
  oneOnOneCadenceDays: 1,
  status: 1,
  updatedAt: 1,
  version: 1,
} as const;

export type DevelopmentRecordSummary = {
  activeGoalCount: number;
  assessedSkillCount: number;
  employeeId: string;
  lastFinalizedOneOnOneOn: string | null;
  nextOneOnOneDueOn: string | null;
  oneOnOneCadenceDays: number | null;
  openActionCount: number;
  overdueActionCount: number;
  overdueGoalCount: number;
};

function parseEmployeeId(employeeId: string) {
  return new ObjectId(developmentObjectIdSchema.parse(employeeId));
}

export function todayInCostaRica() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Costa_Rica",
    year: "numeric",
  }).format(new Date());
}

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function listDevelopmentRecordSummaries(
  employeeIds: string[],
): Promise<DevelopmentRecordSummary[]> {
  if (employeeIds.length === 0) return [];

  const parsedIds = employeeIds.map(parseEmployeeId);
  const database = await getDatabase();
  const today = todayInCostaRica();
  const [profiles, oneOnOnes, goals, assessments] = await Promise.all([
    database
      .collection<DevelopmentProfileDocument>("development_profiles")
      .find(
        { employeeId: { $in: parsedIds }, status: "active" },
        { projection: { _id: 0, employeeId: 1, oneOnOneCadenceDays: 1 } },
      )
      .toArray(),
    database
      .collection<OneOnOneDocument>("development_one_on_ones")
      .find(
        { employeeId: { $in: parsedIds }, status: "finalized" },
        { projection: { _id: 0, actionItems: 1, employeeId: 1, occurredOn: 1 } },
      )
      .toArray(),
    database
      .collection<DevelopmentGoalDocument>("development_goals")
      .find(
        { employeeId: { $in: parsedIds }, status: { $in: ["planned", "in_progress"] } },
        { projection: { _id: 0, employeeId: 1, targetDate: 1 } },
      )
      .toArray(),
    database
      .collection<EmployeeSkillAssessmentDocument>("employee_skill_assessments")
      .find(
        { employeeId: { $in: parsedIds } },
        { projection: { _id: 0, employeeId: 1, skillId: 1 } },
      )
      .toArray(),
  ]);

  const profileByEmployee = new Map(
    profiles.map((profile) => [
      profile.employeeId.toHexString(),
      profile.oneOnOneCadenceDays,
    ]),
  );

  return employeeIds.map((employeeId) => {
    const employeeOneOnOnes = oneOnOnes.filter(
      (record) => record.employeeId.toHexString() === employeeId,
    );
    const lastFinalizedOneOnOneOn = employeeOneOnOnes.reduce<string | null>(
      (latest, record) =>
        !latest || record.occurredOn > latest ? record.occurredOn : latest,
      null,
    );
    const actions = employeeOneOnOnes.flatMap((record) => record.actionItems ?? []);
    const employeeGoals = goals.filter(
      (goal) => goal.employeeId.toHexString() === employeeId,
    );
    const assessedSkills = new Set(
      assessments
        .filter((assessment) => assessment.employeeId.toHexString() === employeeId)
        .map((assessment) => assessment.skillId.toHexString()),
    );
    const oneOnOneCadenceDays = profileByEmployee.get(employeeId) ?? null;

    return {
      activeGoalCount: employeeGoals.length,
      assessedSkillCount: assessedSkills.size,
      employeeId,
      lastFinalizedOneOnOneOn,
      nextOneOnOneDueOn: lastFinalizedOneOnOneOn
        ? addDays(lastFinalizedOneOnOneOn, oneOnOneCadenceDays ?? 30)
        : null,
      oneOnOneCadenceDays,
      openActionCount: actions.filter((action) => action.status === "open").length,
      overdueActionCount: actions.filter(
        (action) => action.status === "open" && action.dueOn && action.dueOn < today,
      ).length,
      overdueGoalCount: employeeGoals.filter((goal) => goal.targetDate < today).length,
    };
  });
}

export async function findDevelopmentProfileSummary(
  employeeId: string,
): Promise<DevelopmentProfileSummary | null> {
  const parsedEmployeeId = parseEmployeeId(employeeId);
  const database = await getDatabase();
  const profile = await database
    .collection<DevelopmentProfileDocument>("development_profiles")
    .findOne(
      { employeeId: parsedEmployeeId },
      { projection: developmentProfileSummaryProjection },
    );

  return profile ? toDevelopmentProfileSummary(profile) : null;
}

export async function listOneOnOneTimelineSummaries({
  employeeId,
  limit = 20,
  sharedOnly,
}: {
  employeeId: string;
  limit?: number;
  sharedOnly: boolean;
}): Promise<OneOnOneTimelineSummary[]> {
  const parsedEmployeeId = parseEmployeeId(employeeId);
  const database = await getDatabase();
  const records = await database
    .collection<OneOnOneDocument>("development_one_on_ones")
    .find(
      {
        employeeId: parsedEmployeeId,
        ...(sharedOnly ? { status: "finalized" as const } : {}),
      },
      { projection: oneOnOneTimelineProjection },
    )
    .sort({ occurredOn: -1 })
    .limit(Math.min(Math.max(limit, 1), 100))
    .toArray();

  return records.map((record) => ({
    amendmentCount: record.amendments.length,
    authorPlatformUserId: record.authorPlatformUserId.toHexString(),
    calendarEventId: record.calendarEventId?.toHexString() ?? null,
    employeeId: record.employeeId.toHexString(),
    finalizedAt: record.finalizedAt?.toISOString() ?? null,
    id: record._id.toHexString(),
    occurredOn: record.occurredOn,
    status: record.status,
    updatedAt: record.updatedAt.toISOString(),
    version: record.version,
  }));
}

export async function findOneOnOneDetail({
  employeeId,
  meetingId,
}: {
  employeeId: string;
  meetingId: string;
}): Promise<OneOnOneDetail | null> {
  const parsedEmployeeId = parseEmployeeId(employeeId);
  const parsedMeetingId = new ObjectId(developmentObjectIdSchema.parse(meetingId));
  const database = await getDatabase();
  const record = await database
    .collection<OneOnOneDocument>("development_one_on_ones")
    .findOne(
      { _id: parsedMeetingId, employeeId: parsedEmployeeId },
      { projection: oneOnOneNarrativeProjection },
    );
  if (!record) return null;

  const narrative = decryptDevelopmentPayload({
    associatedData: { resourceId: meetingId, resourceType: "one_on_one" },
    encrypted: record.narrative,
    schema: oneOnOneNarrativeSchema,
  });
  const descriptionByAction = new Map(
    narrative.agreedActions.map((action) => [action.id, action.description]),
  );

  return {
    actions: record.actionItems.map((action) => ({
      completedAt: action.completedAt?.toISOString() ?? null,
      description: descriptionByAction.get(action.id) ?? "Acción acordada",
      dueOn: action.dueOn,
      id: action.id,
      owner: action.owner,
      status: action.status,
    })),
    amendmentCount: record.amendments.length,
    authorPlatformUserId: record.authorPlatformUserId.toHexString(),
    calendarEventId: record.calendarEventId?.toHexString() ?? null,
    discussionSections: narrative.discussionSections,
    employeeId: record.employeeId.toHexString(),
    finalizedAt: record.finalizedAt?.toISOString() ?? null,
    id: record._id.toHexString(),
    occurredOn: record.occurredOn,
    sharedSummary: narrative.sharedSummary,
    status: record.status,
    updatedAt: record.updatedAt.toISOString(),
    version: record.version,
  };
}

export async function findOneOnOneByCalendarEventId(calendarEventId: string) {
  const parsedCalendarEventId = new ObjectId(
    developmentObjectIdSchema.parse(calendarEventId),
  );
  const database = await getDatabase();
  const record = await database
    .collection<OneOnOneDocument>("development_one_on_ones")
    .findOne(
      { calendarEventId: parsedCalendarEventId },
      { projection: { _id: 1, employeeId: 1, status: 1 } },
    );

  return record
    ? {
        employeeId: record.employeeId.toHexString(),
        meetingId: record._id.toHexString(),
        status: record.status,
      }
    : null;
}

export async function listDevelopmentGoalSummaries({
  employeeId,
  limit = 20,
}: {
  employeeId: string;
  limit?: number;
}) {
  const parsedEmployeeId = parseEmployeeId(employeeId);
  const database = await getDatabase();
  const goals = await database
    .collection<DevelopmentGoalDocument>("development_goals")
    .find(
      { employeeId: parsedEmployeeId },
      { projection: developmentGoalSummaryProjection },
    )
    .sort({ targetDate: 1 })
    .limit(Math.min(Math.max(limit, 1), 100))
    .toArray();

  return goals.map((goal) => ({
    completedAt: goal.completedAt?.toISOString() ?? null,
    employeeId: goal.employeeId.toHexString(),
    id: goal._id.toHexString(),
    linkedSkillIds: goal.linkedSkillIds.map((skillId) => skillId.toHexString()),
    originOneOnOneId: goal.originOneOnOneId?.toHexString() ?? null,
    startDate: goal.startDate,
    status: goal.status,
    targetDate: goal.targetDate,
    updatedAt: goal.updatedAt.toISOString(),
    version: goal.version,
  }));
}

export async function listSkillAssessmentSummaries({
  employeeId,
  limit = 100,
}: {
  employeeId: string;
  limit?: number;
}): Promise<SkillAssessmentSummary[]> {
  const parsedEmployeeId = parseEmployeeId(employeeId);
  const database = await getDatabase();
  const assessments = await database
    .collection<EmployeeSkillAssessmentDocument>("employee_skill_assessments")
    .find(
      { employeeId: parsedEmployeeId },
      { projection: skillAssessmentSummaryProjection },
    )
    .sort({ assessedAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 250))
    .toArray();

  return assessments.map((assessment) => ({
    assessedAt: assessment.assessedAt.toISOString(),
    assessedByPlatformUserId: assessment.assessedByPlatformUserId.toHexString(),
    employeeId: assessment.employeeId.toHexString(),
    id: assessment._id.toHexString(),
    level: assessment.level,
    skillId: assessment.skillId.toHexString(),
    version: assessment.version,
  }));
}

export async function getDevelopmentRecordSummary(
  employeeId: string,
): Promise<DevelopmentRecordSummary> {
  const [summary] = await listDevelopmentRecordSummaries([employeeId]);
  return summary!;
}
