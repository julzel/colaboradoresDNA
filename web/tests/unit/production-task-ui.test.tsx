import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TaskBoard } from "@/features/production-tasks/components/task-board";
import { TaskImport } from "@/features/production-tasks/components/task-import";
import type {
  ProductionBoardResult,
  ProductionImportPreviewResult,
} from "@/features/production-tasks/application/production-task-contracts";
const board: ProductionBoardResult = {
  areas: [],
  canManage: false,
  currentEmployeeId: "me",
  employees: [
    { id: "me", displayName: "Mi nombre", employeeCode: "DNA-0001" },
    { id: "other", displayName: "Otra persona", employeeCode: "DNA-0002" },
  ],
  plan: { id: "plan", revision: 1 },
  query: {
    areaId: null,
    assigneeId: null,
    selectedDate: "2026-09-07",
    status: null,
    view: "week",
    weekStart: "2026-09-07",
    weekEnd: "2026-09-13",
  },
  today: "2026-09-07",
  tasks: ["me", "other"].map((id) => ({
    id,
    planId: "plan",
    workDate: "2026-09-07",
    areaId: "area",
    areaName: "Cocina",
    assigneeEmployeeIds: [id],
    completedAt: null,
    completedByEmployeeId: null,
    description: `Tarea ${id}`,
    permissions: { complete: false, reopen: false, undoCompletion: false },
    sortOrder: 0,
    status: "pending",
    subject: null,
    version: 1,
  })),
};
describe("read-only weekly tasks UI", () => {
  it("shows personal work and the full board without management/edit controls for readers", async () => {
    render(<TaskBoard board={board} />);
    expect(
      screen.queryByRole("link", { name: "Importar tareas" }),
    ).not.toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(within(table).getByText("Tarea other")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Mis tareas" }));
    expect(within(table).queryByText("Tarea other")).not.toBeInTheDocument();
    expect(within(table).getByText("Tarea me")).toBeInTheDocument();
    expect(within(table).queryByRole("textbox")).not.toBeInTheDocument();
  });
  it("exposes import and history only when the server grants management permission", () => {
    render(<TaskBoard board={{ ...board, canManage: true }} />);
    expect(screen.getByRole("link", { name: "Importar tareas" })).toHaveAttribute(
      "href",
      "/tareas/importar",
    );
    expect(screen.getByRole("link", { name: "Historial" })).toHaveAttribute(
      "href",
      "/tareas/historial",
    );
  });
  it("requires validation and a separate explicit import confirmation", async () => {
    const preview: ProductionImportPreviewResult = {
      id: "preview",
      version: 1,
      fileName: "tasks.csv",
      canCommit: true,
      expiresAt: "2026-09-07T12:00:00Z",
      areas: [],
      employees: [],
      targets: [
        { weekStart: "2026-09-07", draft: null, published: { id: "old", version: 1 } },
      ],
      sheets: [
        {
          name: "Tareas",
          selected: true,
          mode: "replace",
          weekStart: "2026-09-07",
          errorCount: 0,
          validCount: 1,
          warningCount: 0,
          rows: [],
        },
      ],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ data: preview }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<TaskImport />);
    await userEvent.upload(
      screen.getByLabelText("Archivo XLSX o CSV (UTF-8)"),
      new File(["csv"], "tasks.csv", { type: "text/csv" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Cargar y revisar" }));
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
    await userEvent.click(
      screen.getByRole("button", { name: "Validar fechas y asignaciones" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(
      screen.getByRole("button", { name: "Confirmar e importar borradores" }),
    ).toBeDisabled();
    expect(screen.getByText(/ya tiene tareas; se reemplazará/)).toBeInTheDocument();
    await userEvent.click(
      screen.getByLabelText(/Revisé las fechas, todas las asignaciones/),
    );
    expect(
      screen.getByRole("button", { name: "Confirmar e importar borradores" }),
    ).toBeEnabled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });
});
