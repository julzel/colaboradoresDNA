import { z } from "zod";

import {
  platformRoleSchema,
  platformUserStatusSchema,
} from "@/features/auth/domain/platform-user";
import { employmentStatusSchema } from "@/features/employees/domain/employee";
import { objectIdStringSchema } from "@/features/employees/domain/shared";

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export const employeeDirectoryQuerySchema = z.object({
  access: z.preprocess(
    firstValue,
    platformUserStatusSchema.optional().catch(undefined),
  ),
  department: z.preprocess(
    firstValue,
    objectIdStringSchema.optional().catch(undefined),
  ),
  employment: z.preprocess(
    firstValue,
    employmentStatusSchema.optional().catch(undefined),
  ),
  page: z.preprocess(firstValue, z.coerce.number().int().min(1).catch(1)),
  role: z.preprocess(firstValue, platformRoleSchema.optional().catch(undefined)),
  search: z.preprocess(
    firstValue,
    z
      .string()
      .trim()
      .max(120)
      .catch("")
      .transform((value) => value || undefined),
  ),
  sort: z.preprocess(
    firstValue,
    z.enum(["name_asc", "name_desc", "start_desc", "start_asc"]).catch("name_asc"),
  ),
});

export type EmployeeDirectoryQuery = z.output<typeof employeeDirectoryQuerySchema>;

export function parseEmployeeDirectoryQuery(
  input: Record<string, string | string[] | undefined>,
) {
  return employeeDirectoryQuerySchema.parse(input);
}

export function createEmployeeDirectoryUrl(
  query: EmployeeDirectoryQuery,
  page = query.page,
) {
  const params = new URLSearchParams();

  if (query.search) params.set("search", query.search);
  if (query.department) params.set("department", query.department);
  if (query.employment) params.set("employment", query.employment);
  if (query.access) params.set("access", query.access);
  if (query.role) params.set("role", query.role);
  if (query.sort !== "name_asc") params.set("sort", query.sort);
  if (page > 1) params.set("page", String(page));

  const suffix = params.toString();
  return suffix ? `/admin/colaboradores?${suffix}` : "/admin/colaboradores";
}
