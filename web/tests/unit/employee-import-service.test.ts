import { beforeEach, describe, expect, it, vi } from "vitest";
import { processEmployeeImport } from "@/features/employees/server/employee-import-service";
import {
  employeeCsvColumns,
  encodeCsv,
} from "@/features/employees/domain/employee-csv";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  departments: vi.fn(),
  create: vi.fn(),
  collection: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/features/auth/server/require-platform-user", () => ({
  requirePlatformUser: mocks.auth,
}));
vi.mock("@/features/employees/server/department-repository", () => ({
  listDepartments: mocks.departments,
}));
vi.mock("@/features/employees/server/employee-service", () => ({
  createEmployeeWithAccess: mocks.create,
}));
vi.mock("@/lib/server/mongodb", () => ({
  getDatabase: async () => ({ collection: mocks.collection }),
}));
const row = [
  "Ana",
  "Pérez",
  "",
  "ana@example.com",
  "",
  "1",
  "6",
  "cedula",
  "123456789",
  "2026-09-01",
  "Producción",
  "Operadora",
  "0",
  "no",
];
const csv = (rows = [row]) => encodeCsv([employeeCsvColumns, ...rows]);

describe("bulk employee service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ platformUser: { id: "actor" } });
    mocks.departments.mockResolvedValue([
      { id: "507f1f77bcf86cd799439011", name: "Producción" },
    ]);
    mocks.collection.mockImplementation(() => ({
      find: () => ({ toArray: async () => [] }),
    }));
    mocks.create.mockResolvedValue({ employee: { id: "created-id" } });
  });
  it("requires administrator authorization before parsing or database access", async () => {
    mocks.auth.mockRejectedValue(new Error("forbidden"));
    await expect(processEmployeeImport(csv(), "import")).rejects.toThrow("forbidden");
    expect(mocks.auth).toHaveBeenCalledWith({ roles: ["administrator"] });
    expect(mocks.collection).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("previews without creating records", async () => {
    expect((await processEmployeeImport(csv(), "validate")).canImport).toBe(true);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("blocks the complete import when any row is invalid", async () => {
    const invalid = [...row];
    invalid[3] = "bad-email";
    const result = await processEmployeeImport(csv([row, invalid]), "import");
    expect(result.canImport).toBe(false);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("marks both repeated emails and documents as errors", async () => {
    const result = await processEmployeeImport(csv([row, row]), "validate");
    expect(
      result.rows.every(
        (item) =>
          item.errors.some((error) => error.includes("correo: está repetido")) &&
          item.errors.some((error) => error.includes("identificacion: está repetida")),
      ),
    ).toBe(true);
  });
  it("rechecks persisted duplicates even if the preview was valid", async () => {
    await processEmployeeImport(csv(), "validate");
    mocks.collection.mockImplementation((name) => ({
      find: () => ({
        toArray: async () =>
          name === "platform_users" ? [{ normalizedEmail: "ana@example.com" }] : [],
      }),
    }));
    const result = await processEmployeeImport(csv(), "import");
    expect(result.rows[0]?.errors.join()).toContain("ya existe");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("creates using the transactional service with collaborator access and no schedule or email send", async () => {
    const result = await processEmployeeImport(csv(), "import");
    expect(result.rows[0]).toMatchObject({
      status: "created",
      employeeId: "created-id",
    });
    expect(mocks.create.mock.calls[0]?.[0]).toMatchObject({
      access: { email: "ana@example.com", role: "collaborator" },
      openingPtoBalanceUnits: 0,
      assignment: { managerEmployeeId: null },
    });
  });
  it("reports a partial result honestly and continues other rows", async () => {
    const second = [...row];
    second[3] = "second@example.com";
    second[8] = "234567891";
    mocks.create.mockRejectedValueOnce(new Error("unavailable"));
    const result = await processEmployeeImport(csv([row, second]), "import");
    expect(result.rows.map((item) => item.status)).toEqual(["failed", "created"]);
    expect(result.canImport).toBe(false);
  });
});
