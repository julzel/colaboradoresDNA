import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PtoAdminRequestDirectory } from "@/features/pto/components/pto-admin-request-directory";
import type { PtoRequestView } from "@/features/pto/view-models/pto-view";

function request(
  id: string,
  requesterName: string,
  status: PtoRequestView["status"],
): PtoRequestView {
  const now = new Date("2026-09-04T12:00:00-06:00");

  return {
    approverName: "Yerlin Márquez",
    assignedApproverPlatformUserId: "platform-approver",
    balanceAfterUnits: null,
    balanceBeforeUnits: null,
    balanceDeltaUnits: null,
    cancelledAt: null,
    category: "vacation",
    collaboratorNote: null,
    createdAt: now,
    createdByName: requesterName,
    createdByPlatformUserId: "platform-creator",
    decidedAt: null,
    decisionNote: null,
    durationCalculation: null,
    durationUnits: 2,
    endDate: "2026-09-09",
    id,
    requestedPortion: "full",
    requesterEmployeeId: `employee-${id}`,
    requesterName,
    requesterPlatformUserId: `platform-${id}`,
    startDate: "2026-09-09",
    status,
    statusHistory: [],
    submittedAt: now,
    updatedAt: now,
  };
}

describe("admin absence request directory", () => {
  it("filters immediately by name without modifying the URL", async () => {
    const user = userEvent.setup();
    render(
      <PtoAdminRequestDirectory
        initialFilter="all"
        requests={[
          request("one", "Julio Zeledón", "approved"),
          request("two", "Kenia Romero", "pending"),
        ]}
      />,
    );

    await user.type(
      screen.getByRole("searchbox", { name: "Buscar solicitudes por nombre" }),
      "zeledon",
    );

    expect(screen.getByText("1 solicitudes")).toBeInTheDocument();
    expect(screen.getByText("Julio Zeledón")).toBeVisible();
    expect(screen.queryByText("Kenia Romero")).not.toBeInTheDocument();
    expect(window.location.search).toBe("");
  });
});
