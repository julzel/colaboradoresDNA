export type EmployeeDomainErrorCode =
  | "assignment_overlap"
  | "department_inactive"
  | "department_name_exists"
  | "employee_exists"
  | "employee_not_found"
  | "manager_cycle"
  | "manager_ineligible"
  | "platform_user_missing"
  | "schedule_overlap";

export class EmployeeDomainError extends Error {
  constructor(readonly code: EmployeeDomainErrorCode) {
    super(code);
    this.name = "EmployeeDomainError";
  }
}
