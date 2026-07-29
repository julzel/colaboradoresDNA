import { describe, expect, it } from "vitest";

import { departmentInputSchema } from "@/features/employees/domain/department";
import {
  employeeInputSchema,
  employeeSelfServiceProfileInputSchema,
  formatEmployeeBirthday,
  formatEmployeeDisplayName,
  formatNationalId,
  getEmployeeInitials,
  identificationInputSchema,
  maskIdentification,
  phoneNumberInputSchema,
} from "@/features/employees/domain/employee";
import {
  dateRangesOverlap,
  previousIsoCalendarDate,
} from "@/features/employees/domain/shared";

const platformUserId = "507f1f77bcf86cd799439011";

function validEmployeeInput() {
  return {
    birthDay: 29,
    birthMonth: 2,
    employmentEndedOn: null,
    employmentStartedOn: "2026-08-01",
    employmentStatus: "active" as const,
    firstSurname: "  Marín  ",
    givenNames: "  Ana   María ",
    identification: {
      type: "national_id" as const,
      value: "1-2345-6789",
    },
    phoneNumber: "8888-7777",
    platformUserId,
    secondSurname: "  Solís ",
    shareBirthdayOnCalendar: true,
  };
}

describe("employee profile model", () => {
  it("normalizes names while preserving accents and canonical fields", () => {
    const employee = employeeInputSchema.parse(validEmployeeInput());

    expect(employee.givenNames).toBe("Ana María");
    expect(employee.firstSurname).toBe("Marín");
    expect(employee.secondSurname).toBe("Solís");
    expect(formatEmployeeDisplayName(employee)).toBe("Ana María Marín Solís");
    expect(getEmployeeInitials(employee)).toBe("AM");
  });

  it("stores a birthday without a year and accepts 29 February", () => {
    const employee = employeeInputSchema.parse({
      ...validEmployeeInput(),
      birthYear: 1990,
    });

    expect(formatEmployeeBirthday(employee)).toBe("29/02");
    expect(employee).not.toHaveProperty("birthYear");
  });

  it("rejects a day that does not exist in the selected month", () => {
    const result = employeeInputSchema.safeParse({
      ...validEmployeeInput(),
      birthDay: 31,
      birthMonth: 4,
    });

    expect(result.success).toBe(false);
  });

  it("requires an end date only for inactive employment", () => {
    expect(
      employeeInputSchema.safeParse({
        ...validEmployeeInput(),
        employmentStatus: "inactive",
      }).success,
    ).toBe(false);

    expect(
      employeeInputSchema.safeParse({
        ...validEmployeeInput(),
        employmentEndedOn: "2026-07-31",
        employmentStatus: "inactive",
      }).success,
    ).toBe(false);

    expect(
      employeeInputSchema.safeParse({
        ...validEmployeeInput(),
        employmentEndedOn: "2026-08-31",
        employmentStatus: "inactive",
      }).success,
    ).toBe(true);
  });

  it("allows future employment start dates", () => {
    expect(
      employeeInputSchema.safeParse({
        ...validEmployeeInput(),
        employmentStartedOn: "2030-01-15",
      }).success,
    ).toBe(true);
  });

  it("allows self-service changes only for phone and birthday sharing", () => {
    const profile = employeeSelfServiceProfileInputSchema.parse({
      firstSurname: "No permitido",
      phoneNumber: "8888-7777",
      shareBirthdayOnCalendar: false,
    });

    expect(profile).toEqual({
      phoneNumber: {
        displayValue: "8888-7777",
        normalizedValue: "+50688887777",
      },
      shareBirthdayOnCalendar: false,
    });
    expect(profile).not.toHaveProperty("firstSurname");
  });
});

describe("identification normalization", () => {
  it.each(["1-2345-6789", "123456789"])(
    "normalizes and formats a valid Cédula física from %s",
    (value) => {
      const identification = identificationInputSchema.parse({
        type: "national_id",
        value,
      });

      expect(identification).toEqual({
        normalizedValue: "123456789",
        type: "national_id",
        value: "1-2345-6789",
      });
      expect(formatNationalId(identification.normalizedValue)).toBe("1-2345-6789");
      expect(maskIdentification(identification)).toBe("••••6789");
    },
  );

  it("rejects Cédula values with a leading zero or wrong separators", () => {
    expect(
      identificationInputSchema.safeParse({
        type: "national_id",
        value: "0-2345-6789",
      }).success,
    ).toBe(false);
    expect(
      identificationInputSchema.safeParse({
        type: "national_id",
        value: "12-345-6789",
      }).success,
    ).toBe(false);
  });

  it.each(["12345678901", "123456789012", "123 4567 8901"])(
    "normalizes a valid DIMEX from %s",
    (value) => {
      const identification = identificationInputSchema.parse({
        type: "residence_id",
        value,
      });

      expect(identification.normalizedValue).toMatch(/^[1-9]\d{10,11}$/);
      expect(identification.value).toBe(identification.normalizedValue);
    },
  );

  it("rejects DIMEX values outside 11 or 12 digits", () => {
    expect(
      identificationInputSchema.safeParse({
        type: "residence_id",
        value: "1234567890",
      }).success,
    ).toBe(false);
  });

  it("normalizes exceptional identifiers deterministically", () => {
    const identification = identificationInputSchema.parse({
      type: "other",
      value: "  cr  ab-12 ",
    });

    expect(identification.value).toBe("cr ab-12");
    expect(identification.normalizedValue).toBe("CR AB-12");
  });
});

describe("contact and department normalization", () => {
  it("normalizes a local Costa Rican phone number to E.164", () => {
    expect(phoneNumberInputSchema.parse("8888-7777")).toEqual({
      displayValue: "8888-7777",
      normalizedValue: "+50688887777",
    });
  });

  it("requires a country code for non-Costa Rican lengths", () => {
    expect(phoneNumberInputSchema.safeParse("2025550123").success).toBe(false);
    expect(phoneNumberInputSchema.parse("+1 202 555 0123")?.normalizedValue).toBe(
      "+12025550123",
    );
  });

  it("treats empty optional phone values as null", () => {
    expect(phoneNumberInputSchema.parse("  ")).toBeNull();
  });

  it("normalizes department names without making them enums", () => {
    const department = departmentInputSchema.parse({
      name: "  Producción ",
    });

    expect(department.name).toBe("Producción");
    expect(department.normalizedName).toBe("produccion");
    expect(department.status).toBe("active");
  });
});

describe("effective date helpers", () => {
  it("treats effective periods as inclusive when detecting overlap", () => {
    expect(
      dateRangesOverlap(
        { effectiveFrom: "2026-01-01", effectiveTo: "2026-06-30" },
        { effectiveFrom: "2026-06-30", effectiveTo: null },
      ),
    ).toBe(true);
    expect(
      dateRangesOverlap(
        { effectiveFrom: "2026-01-01", effectiveTo: "2026-06-30" },
        { effectiveFrom: "2026-07-01", effectiveTo: null },
      ),
    ).toBe(false);
  });

  it("calculates the previous ISO calendar date across month boundaries", () => {
    expect(previousIsoCalendarDate("2026-03-01")).toBe("2026-02-28");
    expect(previousIsoCalendarDate("2028-03-01")).toBe("2028-02-29");
  });
});
