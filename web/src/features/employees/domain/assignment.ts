import type { ObjectId } from "mongodb";
import { z } from "zod";

import {
  isoCalendarDateSchema,
  normalizeHumanText,
  objectIdStringSchema,
} from "@/features/employees/domain/shared";

export type EmployeeAssignmentDocument = {
  _id: ObjectId;
  createdAt: Date;
  createdByPlatformUserId: ObjectId;
  departmentId: ObjectId;
  effectiveFrom: string;
  effectiveTo: string | null;
  employeeId: ObjectId;
  managerEmployeeId: ObjectId | null;
  positionTitle: string;
};

export type EmployeeAssignment = Omit<
  EmployeeAssignmentDocument,
  | "_id"
  | "createdByPlatformUserId"
  | "departmentId"
  | "employeeId"
  | "managerEmployeeId"
> & {
  createdByPlatformUserId: string;
  departmentId: string;
  employeeId: string;
  id: string;
  managerEmployeeId: string | null;
};

export const employeeAssignmentInputSchema = z
  .object({
    createdByPlatformUserId: objectIdStringSchema,
    departmentId: objectIdStringSchema,
    effectiveFrom: isoCalendarDateSchema,
    effectiveTo: isoCalendarDateSchema.nullish().default(null),
    employeeId: objectIdStringSchema,
    managerEmployeeId: objectIdStringSchema.nullish().default(null),
    positionTitle: z
      .string()
      .transform(normalizeHumanText)
      .pipe(z.string().min(1).max(120)),
  })
  .superRefine((assignment, context) => {
    if (assignment.managerEmployeeId === assignment.employeeId) {
      context.addIssue({
        code: "custom",
        message: "La jefatura directa debe ser otra persona.",
        path: ["managerEmployeeId"],
      });
    }

    if (assignment.effectiveTo && assignment.effectiveTo < assignment.effectiveFrom) {
      context.addIssue({
        code: "custom",
        message: "La fecha final no puede ser anterior a la fecha inicial.",
        path: ["effectiveTo"],
      });
    }
  });

export type EmployeeAssignmentInput = z.input<typeof employeeAssignmentInputSchema>;
export type NormalizedEmployeeAssignmentInput = z.output<
  typeof employeeAssignmentInputSchema
>;

export function toEmployeeAssignment(
  document: EmployeeAssignmentDocument,
): EmployeeAssignment {
  const {
    _id,
    createdByPlatformUserId,
    departmentId,
    employeeId,
    managerEmployeeId,
    ...assignment
  } = document;

  return {
    ...assignment,
    createdByPlatformUserId: createdByPlatformUserId.toHexString(),
    departmentId: departmentId.toHexString(),
    employeeId: employeeId.toHexString(),
    id: _id.toHexString(),
    managerEmployeeId: managerEmployeeId?.toHexString() ?? null,
  };
}
