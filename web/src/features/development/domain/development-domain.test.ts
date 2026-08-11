import { describe, expect, it } from "vitest";

import {
  canTransitionDevelopmentGoalStatus,
  developmentGoalInputSchema,
} from "@/features/development/domain/development-goal";
import { developmentProfileInputSchema } from "@/features/development/domain/development-profile";
import {
  canTransitionOneOnOneStatus,
  oneOnOneDraftInputSchema,
  oneOnOneEditorInputSchema,
  oneOnOneFinalizationInputSchema,
  oneOnOneNarrativeSchema,
} from "@/features/development/domain/one-on-one";
import {
  developmentSkillInputSchema,
  skillAssessmentInputSchema,
} from "@/features/development/domain/skill";

const skillId = "507f1f77bcf86cd799439011";

describe("collaborator development domain", () => {
  it("bounds the configurable 1:1 cadence", () => {
    expect(developmentProfileInputSchema.parse({ oneOnOneCadenceDays: "30" })).toEqual({
      oneOnOneCadenceDays: 30,
    });
    expect(
      developmentProfileInputSchema.safeParse({ oneOnOneCadenceDays: 3 }).success,
    ).toBe(false);
  });

  it("normalizes safe draft text and rejects forged actor fields", () => {
    const result = oneOnOneDraftInputSchema.parse({
      narrative: {
        agreedActions: [],
        discussionSections: [
          { heading: "  Avances   del mes ", notes: "Línea 1\r\nLínea 2" },
        ],
        sharedSummary: "  Buen avance  ",
      },
      occurredOn: "2026-08-07",
    });

    expect(result.narrative.discussionSections[0]).toEqual({
      heading: "Avances del mes",
      notes: "Línea 1\nLínea 2",
    });
    expect(
      oneOnOneDraftInputSchema.safeParse({
        actorPlatformUserId: "507f1f77bcf86cd799439012",
        narrative: result.narrative,
        occurredOn: "2026-08-07",
      }).success,
    ).toBe(false);
  });

  it("requires shared content before a 1:1 can be finalized", () => {
    const emptyRecord = {
      narrative: {
        agreedActions: [],
        discussionSections: [],
        sharedSummary: null,
      },
      occurredOn: "2026-08-07",
    };

    expect(oneOnOneDraftInputSchema.safeParse(emptyRecord).success).toBe(true);
    expect(oneOnOneFinalizationInputSchema.safeParse(emptyRecord).success).toBe(false);
  });

  it("maps the focused editor fields and validates a same-day calendar slot", () => {
    const parsed = oneOnOneEditorInputSchema.parse({
      achievements: "Completó la capacitación.",
      agreedActions: [
        {
          description: "Practicar el nuevo proceso.",
          dueOn: "2026-08-14",
          owner: "employee",
        },
      ],
      blockers: "",
      calendarEndDateTime: "2026-08-07T09:30",
      calendarStartDateTime: "2026-08-07T09:00",
      feedback: "",
      occurredOn: "2026-08-07",
      organizationSupport: "Reservar una hora de práctica.",
      scheduleCalendarEvent: true,
      sharedSummary: "Se acordó practicar el proceso.",
    });

    expect(parsed.calendarSchedule).toEqual({
      endDateTime: "2026-08-07T09:30",
      startDateTime: "2026-08-07T09:00",
    });
    expect(parsed.record.narrative.discussionSections).toEqual([
      { heading: "Avances y logros", notes: "Completó la capacitación." },
      {
        heading: "Apoyo acordado por la organización",
        notes: "Reservar una hora de práctica.",
      },
    ]);

    expect(
      oneOnOneEditorInputSchema.safeParse({
        achievements: "",
        agreedActions: [],
        blockers: "",
        calendarEndDateTime: "2026-08-08T09:30",
        calendarStartDateTime: "2026-08-07T09:00",
        feedback: "",
        occurredOn: "2026-08-07",
        organizationSupport: "",
        scheduleCalendarEvent: true,
        sharedSummary: "Seguimiento.",
      }).success,
    ).toBe(false);
  });

  it("keeps finalized 1:1 records out of the editable lifecycle", () => {
    expect(canTransitionOneOnOneStatus("draft", "finalized")).toBe(true);
    expect(canTransitionOneOnOneStatus("finalized", "draft")).toBe(false);
    expect(canTransitionOneOnOneStatus("voided", "draft")).toBe(false);
  });

  it("keeps action due-state metadata outside the encrypted narrative", () => {
    const actionNarrative = {
      agreedActions: [
        {
          description: "Compartir la propuesta.",
          id: "36e8b688-3c21-4ca5-9978-e0f34a59ddf8",
        },
      ],
      discussionSections: [],
      sharedSummary: "Se acordó un próximo paso.",
    };

    expect(oneOnOneNarrativeSchema.safeParse(actionNarrative).success).toBe(true);
    expect(
      oneOnOneNarrativeSchema.safeParse({
        ...actionNarrative,
        agreedActions: [
          {
            ...actionNarrative.agreedActions[0],
            dueOn: "2026-08-14",
            owner: "employee",
            status: "open",
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("requires all four ordered behavioral anchors and normalizes skill names", () => {
    const result = developmentSkillInputSchema.parse({
      category: "Comunicación",
      description: null,
      levelAnchors: [
        { behavior: "Necesita acompañamiento.", level: 1 },
        { behavior: "Aplica con apoyo ocasional.", level: 2 },
        { behavior: "Trabaja con autonomía.", level: 3 },
        { behavior: "Guía a otras personas.", level: 4 },
      ],
      name: " Comunicación Asertiva ",
    });

    expect(result.normalizedName).toBe("comunicacion asertiva");
    expect(
      developmentSkillInputSchema.safeParse({
        ...result,
        levelAnchors: result.levelAnchors.slice(0, 3),
      }).success,
    ).toBe(false);
  });

  it("requires observable assessment evidence without accepting ownership", () => {
    expect(
      skillAssessmentInputSchema.safeParse({
        assessedByPlatformUserId: "507f1f77bcf86cd799439012",
        assessedOn: "2026-08-07",
        evidence: "Aplicó el proceso sin asistencia en tres turnos.",
        level: 3,
      }).success,
    ).toBe(false);
    expect(
      skillAssessmentInputSchema.safeParse({
        assessedOn: "2026-08-07",
        evidence: "\u0000",
        level: 3,
      }).success,
    ).toBe(false);
  });

  it("enforces the roadmap's bounded narrative limits", () => {
    expect(
      oneOnOneDraftInputSchema.safeParse({
        narrative: {
          agreedActions: [],
          discussionSections: [{ heading: "Seguimiento", notes: "n".repeat(2001) }],
          sharedSummary: null,
        },
        occurredOn: "2026-08-07",
      }).success,
    ).toBe(false);
    expect(
      skillAssessmentInputSchema.safeParse({
        assessedOn: "2026-08-07",
        evidence: "e".repeat(751),
        level: 2,
      }).success,
    ).toBe(false);
    expect(
      developmentGoalInputSchema.safeParse({
        linkedSkillIds: [],
        narrative: {
          intendedOutcome: "o".repeat(1001),
          organizationalSupport: null,
          successCriteria: "Completar la práctica acordada.",
          title: "Práctica guiada",
        },
        originOneOnOneId: null,
        startDate: "2026-08-07",
        targetDate: "2026-09-07",
      }).success,
    ).toBe(false);
  });

  it("validates goal chronology, de-duplicates links, and preserves transitions", () => {
    const goalInput = {
      linkedSkillIds: [skillId, skillId],
      narrative: {
        intendedOutcome: "Facilitar una sesión de retroalimentación.",
        organizationalSupport: "Dos horas de preparación.",
        successCriteria: "La sesión termina con acuerdos concretos.",
        title: "Practicar facilitación",
      },
      originOneOnOneId: null,
      startDate: "2026-08-07",
      targetDate: "2026-09-07",
    };
    const result = developmentGoalInputSchema.parse(goalInput);

    expect(result.linkedSkillIds).toEqual([skillId]);
    expect(
      developmentGoalInputSchema.safeParse({
        ...goalInput,
        targetDate: "2026-08-06",
      }).success,
    ).toBe(false);
    expect(canTransitionDevelopmentGoalStatus("completed", "in_progress")).toBe(true);
    expect(canTransitionDevelopmentGoalStatus("completed", "planned")).toBe(false);
  });
});
