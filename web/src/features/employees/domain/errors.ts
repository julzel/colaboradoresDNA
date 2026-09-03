export type EmployeeDomainErrorCode =
  | "assignment_overlap"
  | "department_inactive"
  | "department_name_exists"
  | "employee_exists"
  | "employee_not_found"
  | "employment_date_invalid"
  | "manager_cycle"
  | "manager_ineligible"
  | "platform_user_missing"
  | "schedule_managed_by_scheduler"
  | "schedule_overlap";

export class EmployeeDomainError extends Error {
  constructor(readonly code: EmployeeDomainErrorCode) {
    super(code);
    this.name = "EmployeeDomainError";
  }
}
