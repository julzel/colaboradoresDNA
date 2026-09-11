import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PtoDashboardPage from "@/app/(workspace)/ausencias/page";

const mocks = vi.hoisted(() => ({ getPtoDashboard: vi.fn() }));
vi.mock("@/features/pto/server/pto-service", () => mocks);
vi.mock("@/features/pto/components/pto-request-modal", () => ({
  PtoRequestModal: () => <button>Nueva solicitud</button>,
}));

const request = {
  id: "507f1f77bcf86cd799439015",
  status: "pending",
  category: "other",
  durationUnits: 2,
  startDate: "2026-10-05",
  endDate: "2026-10-05",
  submittedAt: new Date("2026-09-07T12:00:00Z"),
  requesterName: "Audit collaborator",
};

describe("leave dashboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows own pending count separately from the supervisor approval queue", async () => {
    mocks.getPtoDashboard.mockResolvedValue({
      canRequest: true,
      balanceUnits: 10,
      ownRequests: [request],
      pendingApprovals: [request, { ...request, id: "507f1f77bcf86cd799439016" }],
    });
    render(await PtoDashboardPage({ searchParams: Promise.resolve({}) }));
    const summary = screen.getByRole("region", { name: "Resumen de ausencias" });
    expect(within(summary).getByText("1")).toBeInTheDocument();
    const queue = screen.getByRole("region", { name: "Solicitudes de mi equipo" });
    expect(within(queue).getAllByRole("link")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Nueva solicitud" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Borradores 0" })).toBeInTheDocument();
  });

  it("does not offer an unusable own-request form for an account without an employee", async () => {
    mocks.getPtoDashboard.mockResolvedValue({
      canRequest: false,
      balanceUnits: null,
      ownRequests: [],
      pendingApprovals: [],
    });
    render(await PtoDashboardPage({ searchParams: Promise.resolve({}) }));
    expect(
      screen.queryByRole("button", { name: "Nueva solicitud" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Solicitudes por aprobar" }),
    ).not.toBeInTheDocument();
  });
});
