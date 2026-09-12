import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { TaskEditor } from "@/features/production-tasks/components/task-editor";
import { TaskGrid } from "@/features/production-tasks/components/task-grid";
import type { ProductionBoardResult } from "@/features/production-tasks/application/production-task-contracts";
const mocks = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), fetch: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
const options = {
  today: "2026-09-12",
  targetPlanId: "plan",
  areas: [{ id: "area", name: "Cocina" }],
  employees: [
    { id: "ana", displayName: "Ana Mora", employeeCode: "DNA-0001" },
    { id: "luis", displayName: "Luis Solís", employeeCode: "DNA-0002" },
  ],
};
const task: ProductionBoardResult["tasks"][number] = {
  id: "task",
  planId: "plan",
  version: 2,
  workDate: "2026-09-12",
  areaId: "area",
  areaName: "Cocina",
  description: "Preparar",
  subject: "Pollo",
  assigneeEmployeeIds: ["ana"],
  sortOrder: 0,
  status: "pending",
  completedAt: null,
  completedByEmployeeId: null,
  permissions: { complete: false, reopen: false, undoCompletion: false },
};
describe("task editor", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.fetch.mockImplementation(async (_url: string, init?: RequestInit) => ({
      ok: true,
      json: async () => ({
        data:
          init?.method === "POST"
            ? { taskId: "task", date: "2026-09-12", planIds: ["new-plan"] }
            : options,
      }),
    }));
    vi.stubGlobal("fetch", mocks.fetch);
  });
  afterEach(() => vi.unstubAllGlobals());
  it("searches by name and submits multiple assignees to the API", async () => {
    const user = userEvent.setup();
    const close = vi.fn();
    render(
      <TaskEditor
        task={task}
        today={options.today}
        initialDate={options.today}
        onClose={close}
      />,
    );
    await screen.findByLabelText("Ana Mora");
    await user.type(screen.getByLabelText("Buscar colaborador"), "solis");
    expect(screen.queryByLabelText("Ana Mora")).not.toBeInTheDocument();
    await user.click(screen.getByLabelText("Luis Solís"));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(close).toHaveBeenCalled());
    const posted = mocks.fetch.mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(posted![1].body)).toMatchObject({
      action: "update",
      source: { planId: "plan", expectedTaskVersion: 2 },
      task: { assigneeEmployeeIds: ["ana", "luis"] },
    });
    expect(mocks.refresh).toHaveBeenCalled();
  });
  it("requires explicit confirmation before removing a task", async () => {
    const user = userEvent.setup();
    render(
      <TaskEditor
        task={task}
        today={options.today}
        initialDate={options.today}
        onClose={vi.fn()}
      />,
    );
    await screen.findByLabelText("Ana Mora");
    await user.click(screen.getByRole("button", { name: "Eliminar tarea" }));
    expect(
      mocks.fetch.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Confirmar eliminación" }));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
    const posted = mocks.fetch.mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(posted![1].body)).toEqual({
      action: "remove",
      source: { taskId: "task", planId: "plan", expectedTaskVersion: 2 },
    });
  });
  it("shows availability warnings, retains values, and resets acknowledgment after editing", async () => {
    const user = userEvent.setup();
    mocks.fetch.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? {
            ok: false,
            json: async () => ({
              code: "warnings_unacknowledged",
              error: "Revisá la disponibilidad",
              warnings: ["approved_leave"],
            }),
          }
        : { ok: true, json: async () => ({ data: options }) },
    );
    render(
      <TaskEditor
        task={task}
        today={options.today}
        initialDate={options.today}
        onClose={vi.fn()}
      />,
    );
    await screen.findByLabelText("Ana Mora");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await screen.findByText("Una persona asignada tiene una ausencia aprobada.");
    expect(screen.getByLabelText("Tarea")).toHaveValue("Preparar");
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
    await user.click(
      screen.getByLabelText("Revisé la disponibilidad y quiero guardar la tarea."),
    );
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeEnabled();
    await user.type(screen.getByLabelText("Tarea"), " alimento");
    expect(
      screen.queryByLabelText("Revisé la disponibilidad y quiero guardar la tarea."),
    ).not.toBeInTheDocument();
  });
  it("locks past rows and hides management controls from readers", () => {
    const { rerender } = render(
      <TaskGrid
        tasks={[{ ...task, workDate: "2026-09-11" }]}
        employees={options.employees}
        today={options.today}
        onEdit={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /Editar/ })).not.toBeInTheDocument();
    rerender(
      <TaskGrid tasks={[task]} employees={options.employees} today={options.today} />,
    );
    expect(screen.queryByRole("button", { name: /Editar/ })).not.toBeInTheDocument();
  });
});
