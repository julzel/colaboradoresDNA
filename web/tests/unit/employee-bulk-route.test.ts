// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/employees/bulk/route";
import { employeeCsvColumns, parseCsv } from "@/features/employees/domain/employee-csv";

const mocks = vi.hoisted(() => ({
  identity: vi.fn(),
  auth: vi.fn(),
  process: vi.fn(),
  export: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/features/auth/server/auth-provider", () => ({
  getIdentitySession: mocks.identity,
}));
vi.mock("@/features/auth/server/require-platform-user", () => ({
  requirePlatformUser: mocks.auth,
}));
vi.mock("@/features/employees/server/employee-import-service", () => ({
  processEmployeeImport: mocks.process,
  exportEmployeeDirectoryCsv: mocks.export,
}));

describe("bulk route contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("APP_BASE_URL", "http://localhost:3000");
    mocks.identity.mockResolvedValue({ user: { id: "user" } });
    mocks.auth.mockResolvedValue({ platformUser: { id: "admin" } });
  });
  it("downloads a header-only template with attachment and no-store headers", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/employees/bulk?download=template"),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain(
      "plantilla-colaboradores.csv",
    );
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(parseCsv(await response.text())).toEqual([employeeCsvColumns]);
    expect(mocks.process).not.toHaveBeenCalled();
  });
  it("downloads the directory returned by the owning service", async () => {
    mocks.export.mockResolvedValue("codigo,nombre\r\nDNA-0001,Ana\r\n");
    const response = await GET(
      new Request("http://localhost:3000/api/employees/bulk?download=directory"),
    );
    expect(await response.text()).toContain("DNA-0001,Ana");
    expect(response.headers.get("content-disposition")).toContain("colaboradores.csv");
  });
  it("prevents unauthorized exports before invoking the service", async () => {
    mocks.identity.mockResolvedValue(null);
    expect(
      (
        await GET(
          new Request("http://localhost:3000/api/employees/bulk?download=directory"),
        )
      ).status,
    ).toBe(401);
    expect(mocks.export).not.toHaveBeenCalled();
  });
  it("returns row results and refreshes the directory after successful creation", async () => {
    mocks.process.mockResolvedValue({
      mode: "import",
      canImport: false,
      rows: [{ status: "created", employeeId: "employee" }],
    });
    const response = await POST(
      new Request("http://localhost:3000/api/employees/bulk", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({ csv: "contents", mode: "import" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.process).toHaveBeenCalledWith("contents", "import");
    expect(mocks.revalidate).toHaveBeenCalledWith("/admin/colaboradores");
  });
});
