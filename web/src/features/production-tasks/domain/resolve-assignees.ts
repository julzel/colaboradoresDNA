import { normalizeProductionLookup } from "./shared";

type EmployeeIdentity = {
  employeeId: string;
  employeeCode: string | null;
  displayName: string;
};

/** Match complete catalog names or codes. Never guess between duplicate names. */
export function resolveTaskAssignees(values: string[], employees: EmployeeIdentity[]) {
  const ids: string[] = [];
  for (const value of values) {
    const normalized = normalizeProductionLookup(value);
    const codes = employees.filter(
      (employee) =>
        employee.employeeCode &&
        normalizeProductionLookup(employee.employeeCode) === normalized,
    );
    const matches = codes.length
      ? codes
      : employees.filter(
          (employee) => normalizeProductionLookup(employee.displayName) === normalized,
        );
    // An incomplete shared assignment must remain blocked for explicit correction.
    if (matches.length !== 1) return [];
    ids.push(matches[0]!.employeeId);
  }
  return [...new Set(ids)];
}
