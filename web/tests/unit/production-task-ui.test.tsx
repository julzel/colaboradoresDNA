import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TaskBoard } from "@/features/production-tasks/components/task-board";
import { TaskImport } from "@/features/production-tasks/components/task-import";
import type {
  ProductionBoardResult,
  ProductionImportPreviewResult,
} from "@/features/production-tasks/application/production-task-contracts";
const navigation = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
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
    const { rerender } = render(<TaskBoard board={board} />);
    expect(
      screen.queryByRole("link", { name: "Importar tareas" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Tarea other")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Mis tareas/ })).toHaveAttribute(
      "href",
      "/tareas?fecha=2026-09-07&periodo=dia&vista=mias",
    );
    rerender(<TaskBoard board={board} initialMine />);
    expect(screen.queryByText("Tarea other")).not.toBeInTheDocument();
    expect(screen.getByText("Tarea me")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Editar/ })).not.toBeInTheDocument();
  });
  it("exposes history only when the server grants management permission", () => {
    render(<TaskBoard board={{ ...board, canManage: true }} />);
    expect(screen.getByRole("link", { name: "Historial" })).toHaveAttribute(
      "href",
      "/tareas/historial",
    );
  });
  it("shows only the chosen day and preserves filters across day/week boundaries", () => {
    render(<TaskBoard board={board} initialMine initialArea="area" />);
    expect(screen.getByRole("link", { name: "Día anterior" })).toHaveAttribute(
      "href",
      "/tareas?fecha=2026-09-06&periodo=dia&vista=mias&area=area",
    );
    expect(screen.getByRole("link", { name: "Semana" })).toHaveAttribute(
      "href",
      "/tareas?fecha=2026-09-07&periodo=semana&vista=mias&area=area",
    );
    expect(screen.getByRole("link", { name: "Día" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      within(
        screen.getByRole("navigation", { name: "Días de la semana" }),
      ).getAllByRole("link"),
    ).toHaveLength(7);
    const form = screen.getByLabelText("Ir a una fecha").closest("form")!;
    expect(new FormData(form).get("area")).toBe("area");
    expect(new FormData(form).get("vista")).toBe("mias");
  });
  it("groups all seven days in week view, including empty days", () => {
    const nextTask = {
      ...board.tasks[0]!,
      id: "next",
      workDate: "2026-09-08",
      description: "Tarea del martes",
    };
    const { rerender } = render(
      <TaskBoard board={{ ...board, tasks: [...board.tasks, nextTask] }} />,
    );
    expect(screen.queryByText("Tarea del martes")).not.toBeInTheDocument();
    rerender(
      <TaskBoard
        board={{ ...board, tasks: [...board.tasks, nextTask] }}
        initialView="week"
      />,
    );
    expect(screen.getByText("Tarea del martes")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(7);
    expect(screen.getAllByText("Sin tareas para este día.")).toHaveLength(5);
    expect(screen.getByRole("link", { name: "Semana siguiente" })).toHaveAttribute(
      "href",
      "/tareas?fecha=2026-09-14&periodo=semana",
    );
  });
  it("distinguishes unpublished plans and filtered empty days", () => {
    const { rerender } = render(
      <TaskBoard board={{ ...board, plan: null, tasks: [] }} />,
    );
    expect(
      screen.getByText("El plan de esta semana aún no está publicado"),
    ).toBeInTheDocument();
    rerender(<TaskBoard board={board} initialArea="missing" />);
    expect(screen.getByText("No hay tareas con estos filtros.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Limpiar filtros" })).toHaveAttribute(
      "href",
      "/tareas?fecha=2026-09-07&periodo=dia",
    );
  });
  it("keeps past tasks read-only for managers", () => {
    render(<TaskBoard board={{ ...board, canManage: true, today: "2026-09-08" }} />);
    expect(screen.queryByRole("button", { name: /^Editar/ })).not.toBeInTheDocument();
    expect(screen.getAllByText("Fecha pasada · Solo lectura")).toHaveLength(2);
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
