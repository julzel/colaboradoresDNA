import type { ObjectId } from "mongodb";
import { z } from "zod";

import {
  developmentIsoDateSchema,
  developmentNarrativeTextSchema,
  developmentSingleLineTextSchema,
  optionalDevelopmentNarrativeTextSchema,
  type DevelopmentEncryptedPayload,
} from "@/features/development/domain/shared";

export const developmentSkillStatusSchema = z.enum(["active", "inactive"]);
export const developmentSkillLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export type DevelopmentSkillStatus = z.infer<typeof developmentSkillStatusSchema>;
export type DevelopmentSkillLevel = z.infer<typeof developmentSkillLevelSchema>;

const skillLevelAnchor = <Level extends DevelopmentSkillLevel>(level: Level) =>
  z
    .object({
      behavior: developmentNarrativeTextSchema({ max: 1000 }),
      level: z.literal(level),
    })
    .strict();

export const developmentSkillLevelAnchorsSchema = z.tuple([
  skillLevelAnchor(1),
  skillLevelAnchor(2),
  skillLevelAnchor(3),
  skillLevelAnchor(4),
]);

export function normalizeDevelopmentSkillName(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-CR");
}

export const developmentSkillInputSchema = z
  .object({
    category: developmentSingleLineTextSchema({ max: 80 }),
    description: optionalDevelopmentNarrativeTextSchema(1000),
    levelAnchors: developmentSkillLevelAnchorsSchema,
    name: developmentSingleLineTextSchema({ max: 120 }),
  })
  .strict()
  .transform((skill) => ({
    ...skill,
    normalizedName: normalizeDevelopmentSkillName(skill.name),
  }));

export const skillAssessmentInputSchema = z
  .object({
    assessedOn: developmentIsoDateSchema,
    evidence: developmentNarrativeTextSchema({ max: 750 }),
    level: developmentSkillLevelSchema,
  })
  .strict();

export type DevelopmentSkillInput = z.input<typeof developmentSkillInputSchema>;
export type NormalizedDevelopmentSkillInput = z.output<
  typeof developmentSkillInputSchema
>;
export type SkillAssessmentInput = z.output<typeof skillAssessmentInputSchema>;

export type DevelopmentSkillDocument = {
  _id: ObjectId;
  category: string;
  createdAt: Date;
  createdByPlatformUserId: ObjectId;
  description: string | null;
  levelAnchors: z.output<typeof developmentSkillLevelAnchorsSchema>;
  name: string;
  normalizedName: string;
  status: DevelopmentSkillStatus;
  updatedAt: Date;
  updatedByPlatformUserId: ObjectId;
  version: number;
};

export type EmployeeSkillAssessmentDocument = {
  _id: ObjectId;
  assessedAt: Date;
  assessedByPlatformUserId: ObjectId;
  employeeId: ObjectId;
  evidence: DevelopmentEncryptedPayload;
  level: DevelopmentSkillLevel;
  skillId: ObjectId;
  updatedAt: Date;
  version: number;
};

export type EmployeeSkillAssessmentHistoryDocument = {
  _id: ObjectId;
  assessedAt: Date;
  assessedByPlatformUserId: ObjectId;
  employeeId: ObjectId;
  evidence: DevelopmentEncryptedPayload;
  level: DevelopmentSkillLevel;
  previousLevel: DevelopmentSkillLevel | null;
  skillId: ObjectId;
};

export type SkillAssessmentSummary = {
  assessedAt: string;
  assessedByPlatformUserId: string;
  employeeId: string;
  id: string;
  level: DevelopmentSkillLevel;
  skillId: string;
  version: number;
};
