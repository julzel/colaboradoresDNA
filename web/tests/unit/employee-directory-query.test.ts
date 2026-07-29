import { describe, expect, it } from "vitest";

import {
  createEmployeeDirectoryUrl,
  parseEmployeeDirectoryQuery,
} from "@/features/employees/domain/employee-directory-query";

describe("employee directory query", () => {
  it("uses safe defaults for unsupported or malformed URL values", () => {
    expect(
      parseEmployeeDirectoryQuery({
        access: "unknown",
        page: "-2",
        role: "owner",
        sort: "unsupported",
      }),
    ).toEqual({
      page: 1,
      search: undefined,
      sort: "name_asc",
    });
  });

  it("parses supported filters and keeps the first repeated value", () => {
    expect(
      parseEmployeeDirectoryQuery({
        access: "invited",
        employment: "active",
        page: "3",
        role: "supervisor",
        search: ["  Ana  ", "ignored"],
        sort: "start_desc",
      }),
    ).toEqual({
      access: "invited",
      employment: "active",
      page: 3,
      role: "supervisor",
      search: "Ana",
      sort: "start_desc",
    });
  });

  it("serializes only meaningful filter state", () => {
    const query = parseEmployeeDirectoryQuery({
      page: "2",
      role: "administrator",
      search: "María",
    });

    expect(createEmployeeDirectoryUrl(query)).toBe(
      "/admin/colaboradores?search=Mar%C3%ADa&role=administrator&page=2",
    );
    expect(createEmployeeDirectoryUrl(query, 1)).toBe(
      "/admin/colaboradores?search=Mar%C3%ADa&role=administrator",
    );
  });
});
