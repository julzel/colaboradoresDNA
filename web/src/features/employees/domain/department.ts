import type { ObjectId } from "mongodb";
import { z } from "zod";

import {
  normalizeHumanText,
  normalizeSearchText,
  objectIdStringSchema,
} from "@/features/employees/domain/shared";

export const departmentStatusSchema = z.enum(["active", "inactive"]);
export type DepartmentStatus = z.infer<typeof departmentStatusSchema>;

export type DepartmentDocument = {
  _id: ObjectId;
  createdAt: Date;
  description: string | null;
  name: string;
  normalizedName: string;
  status: DepartmentStatus;
  updatedAt: Date;
};

export type Department = Omit<DepartmentDocument, "_id"> & { id: string };

export const departmentIdSchema = objectIdStringSchema;

export const departmentInputSchema = z
  .object({
    description: z
      .string()
      .nullable()
      .optional()
      .transform((value) => {
        if (value === null || value === undefined) {
          return null;
        }

        const normalized = normalizeHumanText(value);
        return normalized.length > 0 ? normalized : null;
      })
      .pipe(z.string().max(500).nullable()),
    name: z.string().transform(normalizeHumanText).pipe(z.string().min(2).max(100)),
    status: departmentStatusSchema.default("active"),
  })
  .transform((department) => ({
    ...department,
    normalizedName: normalizeSearchText(department.name),
  }));

export type DepartmentInput = z.input<typeof departmentInputSchema>;
export type NormalizedDepartmentInput = z.output<typeof departmentInputSchema>;

export function toDepartment(document: DepartmentDocument): Department {
  const { _id, ...department } = document;
  return { ...department, id: _id.toHexString() };
}
