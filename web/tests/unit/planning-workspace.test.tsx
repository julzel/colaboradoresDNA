import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlanningWorkspace } from "@/features/planning/components/planning-workspace";
import { planningApi } from "@/features/planning/client/planning-api";
import {
  emptyWorkspace,
  type Bootstrap,
  type Proposal,
} from "@/features/planning/domain/contracts";
import { planningContext, planningOutput } from "../fixtures/planning";

vi.mock("@/features/planning/client/planning-api", () => ({
  planningApi: {
    load: vi.fn(),
    generate: vi.fn(),
    accept: vi.fn(),
    updateTask: vi.fn(),
    saveContext: vi.fn(),
  },
}));

const proposal: Proposal = {
  ...planningOutput(),
  id: "proposal-1",
  contextVersion: 1,
  sources: planningContext.records,
  createdAt: "2026-09-07T12:00:00Z",
  model: "test",
  promptVersion: "v1",
  usage: { inputTokens: 10, outputTokens: 10 },
};
const bootstrap: Bootstrap = {
  workspace: emptyWorkspace(),
  context: planningContext,
  configured: true,
  model: "test",
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(planningApi.load).mockResolvedValue(structuredClone(bootstrap));
});

describe("planning UI", () => {
  it("distinguishes a finished plan from blocked work", async () => {
    vi.mocked(planningApi.load).mockResolvedValue({
      ...bootstrap,
      workspace: {
        ...emptyWorkspace(),
        acceptedPlan: {
          ...proposal,
          tasks: proposal.tasks.map((task) => ({ ...task, status: "done" })),
        },
      },
    });
    render(<PlanningWorkspace />);
    expect(
      await screen.findByText(/No quedan tareas pendientes en este plan/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Revisá los bloqueos/)).not.toBeInTheDocument();
  });

  it("prioritizes, edits and explicitly accepts a proposal through the HTTP client", async () => {
    const generated = {
      ...emptyWorkspace(),
      version: 2,
      input: "Revisar el proceso",
      proposal,
    };
    vi.mocked(planningApi.generate).mockResolvedValue(generated);
    vi.mocked(planningApi.accept).mockImplementation(async (_version, _id, tasks) => ({
      ...generated,
      version: 3,
      proposal: null,
      acceptedPlan: { ...proposal, tasks },
    }));
    render(<PlanningWorkspace />);
    fireEvent.change(await screen.findByRole("textbox", { name: "Tus pendientes" }), {
      target: { value: "Revisar el proceso" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Priorizar" }));
    expect(
      await screen.findByRole("heading", { name: "Propuesta para revisar" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Tu plan en marcha" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Evidencia y edición"));
    fireEvent.change(screen.getByRole("textbox", { name: "Título de la tarea" }), {
      target: { value: "Revisión acordada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aceptar plan" }));
    expect(
      await screen.findByRole("heading", { name: "Tu plan en marcha" }),
    ).toBeInTheDocument();
    expect(planningApi.accept).toHaveBeenCalledWith(2, "proposal-1", [
      expect.objectContaining({ title: "Revisión acordada" }),
    ]);
    expect(planningApi.generate).toHaveBeenCalledWith(
      expect.objectContaining({ input: "Revisar el proceso", version: 0 }),
    );
  });

  it("retains typed input after service failure and refreshes the resource version", async () => {
    vi.mocked(planningApi.generate).mockRejectedValue(
      new Error("El servicio de IA no respondió."),
    );
    render(<PlanningWorkspace />);
    const textbox = await screen.findByRole("textbox", { name: "Tus pendientes" });
    fireEvent.change(textbox, { target: { value: "Mi lista sin perder" } });
    fireEvent.click(screen.getByRole("button", { name: "Priorizar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El servicio de IA no respondió.",
    );
    expect(textbox).toHaveValue("Mi lista sin perder");
    await waitFor(() => expect(planningApi.load).toHaveBeenCalledTimes(2));
  });
});
