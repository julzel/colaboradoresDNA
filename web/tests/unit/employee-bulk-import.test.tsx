import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmployeeBulkImport } from "@/features/employees/components/employee-bulk-import";

afterEach(() => vi.unstubAllGlobals());

describe("bulk import UI", () => {
  it("requires a valid preview and confirmation before creating, then shows the result", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            mode: "validate",
            canImport: true,
            rows: [
              {
                row: 2,
                name: "Ana Pérez",
                email: "ana@example.com",
                status: "valid",
                errors: [],
              },
            ],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            mode: "import",
            canImport: false,
            rows: [
              {
                row: 2,
                name: "Ana Pérez",
                email: "ana@example.com",
                status: "created",
                employeeId: "employee",
                errors: [],
              },
            ],
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);
    render(<EmployeeBulkImport departments={["Producción"]} />);
    expect(screen.getByRole("button", { name: "Validar archivo" })).toBeDisabled();
    const file = new File(["csv"], "personas.csv", { type: "text/csv" });
    Object.defineProperty(file, "text", { value: async () => "csv" });
    fireEvent.change(screen.getByLabelText("Archivo CSV"), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Validar archivo" }));
    const create = await screen.findByRole("button", { name: "Crear 1 colaboradores" });
    expect(create).toBeDisabled();
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).mode).toBe("validate");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(create);
    expect(
      await screen.findByRole("link", { name: "Ver colaborador" }),
    ).toHaveAttribute("href", "/admin/colaboradores/employee");
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body).mode).toBe("import");
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
  it("shows validation errors without offering a create action", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            mode: "validate",
            canImport: false,
            rows: [
              {
                row: 2,
                name: "Ana",
                email: "",
                status: "invalid",
                errors: ["correo: ingresá un correo válido."],
              },
            ],
          },
        }),
      }),
    );
    render(<EmployeeBulkImport departments={[]} />);
    const file = new File(["csv"], "personas.csv");
    Object.defineProperty(file, "text", { value: async () => "csv" });
    fireEvent.change(screen.getByLabelText("Archivo CSV"), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Validar archivo" }));
    await waitFor(() =>
      expect(screen.getByText("correo: ingresá un correo válido.")).toBeInTheDocument(),
    );
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});
