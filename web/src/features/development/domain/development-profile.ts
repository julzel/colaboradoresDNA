import type { ObjectId } from "mongodb";
import { z } from "zod";

export const developmentProfileStatusSchema = z.enum(["active", "archived"]);

export type DevelopmentProfileStatus = z.infer<typeof developmentProfileStatusSchema>;

export const developmentProfileInputSchema = z
  .object({
    oneOnOneCadenceDays: z.coerce
      .number({ error: "Ingresá una frecuencia válida." })
      .int("La frecuencia debe expresarse en días completos.")
      .min(7, "La frecuencia mínima es de 7 días.")
      .max(365, "La frecuencia máxima es de 365 días."),
  })
  .strict();

export type DevelopmentProfileInput = z.input<typeof developmentProfileInputSchema>;
export type NormalizedDevelopmentProfileInput = z.output<
  typeof developmentProfileInputSchema
>;

export type DevelopmentProfileDocument = {
  _id: ObjectId;
  archivedAt: Date | null;
  archivedByPlatformUserId: ObjectId | null;
  createdAt: Date;
  employeeId: ObjectId;
  oneOnOneCadenceDays: number;
  status: DevelopmentProfileStatus;
  updatedAt: Date;
  version: number;
};

export type DevelopmentProfileSummary = {
  archivedAt: string | null;
  employeeId: string;
  id: string;
  oneOnOneCadenceDays: number;
  status: DevelopmentProfileStatus;
  updatedAt: string;
  version: number;
};

export function toDevelopmentProfileSummary(
  document: DevelopmentProfileDocument,
): DevelopmentProfileSummary {
  return {
    archivedAt: document.archivedAt?.toISOString() ?? null,
    employeeId: document.employeeId.toHexString(),
    id: document._id.toHexString(),
    oneOnOneCadenceDays: document.oneOnOneCadenceDays,
    status: document.status,
    updatedAt: document.updatedAt.toISOString(),
    version: document.version,
  };
}
