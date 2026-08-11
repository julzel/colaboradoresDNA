import { describe, expect, it, vi } from "vitest";

import { developmentAuditInputSchema } from "@/features/development/server/development-audit-repository";
import { developmentEmployeeReferenceProjection } from "@/features/development/server/development-employee-read-repository";
import { developmentIndexDefinitions } from "@/features/development/server/development-indexes";
import {
  developmentGoalSummaryProjection,
  oneOnOneNarrativeProjection,
  oneOnOneTimelineProjection,
  skillAssessmentSummaryProjection,
} from "@/features/development/server/development-read-repository";

vi.mock("server-only", () => ({}));

const id = "507f1f77bcf86cd799439011";

describe("development storage safety contracts", () => {
  it("accepts only content-free audit fields", () => {
    const safeAudit = {
      action: "one_on_one_updated",
      actorPlatformUserId: id,
      changedFields: ["narrative_payload"],
      employeeId: id,
      outcome: "succeeded",
      resourceId: id,
      resourceType: "one_on_one",
    };

    expect(developmentAuditInputSchema.safeParse(safeAudit).success).toBe(true);
    expect(
      developmentAuditInputSchema.safeParse({
        ...safeAudit,
        note: "This narrative must never reach audit storage.",
      }).success,
    ).toBe(false);
    expect(
      developmentAuditInputSchema.safeParse({
        ...safeAudit,
        changedFields: ["actual_note_text"],
      }).success,
    ).toBe(false);
  });

  it("keeps encrypted narrative and evidence out of list projections", () => {
    expect(developmentEmployeeReferenceProjection).toEqual({
      _id: 1,
      employmentStatus: 1,
    });
    expect(oneOnOneTimelineProjection).not.toHaveProperty("narrative");
    expect(oneOnOneTimelineProjection).not.toHaveProperty("voidPayload");
    expect(developmentGoalSummaryProjection).not.toHaveProperty("narrative");
    expect(skillAssessmentSummaryProjection).not.toHaveProperty("evidence");
    expect(oneOnOneNarrativeProjection).toHaveProperty("narrative", 1);
    expect(oneOnOneNarrativeProjection).not.toHaveProperty("voidPayload");
  });

  it("defines migration indexes for every collection in the approved model", () => {
    expect(Object.keys(developmentIndexDefinitions).sort()).toEqual([
      "development_audit",
      "development_goal_updates",
      "development_goals",
      "development_one_on_ones",
      "development_profiles",
      "development_skills",
      "employee_skill_assessment_history",
      "employee_skill_assessments",
    ]);
    expect(developmentIndexDefinitions.development_one_on_ones).toContainEqual(
      expect.objectContaining({
        key: {
          employeeId: 1,
          "actionItems.status": 1,
          "actionItems.dueOn": 1,
        },
        name: "development_one_on_ones_open_actions",
      }),
    );
    expect(developmentIndexDefinitions.development_one_on_ones).toContainEqual(
      expect.objectContaining({
        key: { calendarEventId: 1 },
        name: "development_one_on_ones_calendar_event_unique",
        unique: true,
      }),
    );
  });
});
