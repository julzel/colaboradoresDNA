import { describe, expect, it } from "vitest";
import { resolveTaskAssignees } from "@/features/production-tasks/domain/resolve-assignees";

const employees = [
  { employeeId: "1", employeeCode: "DNA-0001", displayName: "Julio Alberto" },
  { employeeId: "2", employeeCode: "DNA-0002", displayName: "María Solís" },
];

describe("template collaborator matching", () => {
  it("resolves multiple catalog names ignoring accents, case and spacing", () => {
    expect(
      resolveTaskAssignees([" julio   ALBERTO ", "Maria Solis"], employees),
    ).toEqual(["1", "2"]);
  });
  it("accepts mixed names and codes and deduplicates people", () => {
    expect(
      resolveTaskAssignees(["Julio Alberto", "dna-0002", "DNA-0001"], employees),
    ).toEqual(["1", "2"]);
  });
  it("blocks unknown and partial names without silently dropping an assignee", () => {
    expect(resolveTaskAssignees(["Julio Alberto", "Maria"], employees)).toEqual([]);
  });
  it("requires selection for ambiguous names while allowing a unique code", () => {
    const duplicate = [
      ...employees,
      { employeeId: "3", employeeCode: "DNA-0003", displayName: "Julio Alberto" },
    ];
    expect(resolveTaskAssignees(["Julio Alberto"], duplicate)).toEqual([]);
    expect(resolveTaskAssignees(["DNA-0001"], duplicate)).toEqual(["1"]);
  });
});
