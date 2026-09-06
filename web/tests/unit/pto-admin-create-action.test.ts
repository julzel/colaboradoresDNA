import { beforeEach, describe, expect, it, vi } from "vitest";

import { saveEmployeePtoDraftAction } from "@/features/pto/actions/pto-actions";
import { initialPtoActionState } from "@/features/pto/domain/pto-action-state";

const mocks = vi.hoisted(() => ({
  createAndApprove: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/features/pto/server/pto-service", () => ({
  adjustEmployeePtoBalance: vi.fn(),
  cancelOwnPtoRequest: vi.fn(),
  createAndApproveEmployeePtoRequestAsAdministrator: mocks.createAndApprove,
  createOwnPtoDraft: vi.fn(),
  decidePtoRequestWithConfirmation: vi.fn(),
  openEmployeePtoBalance: vi.fn(),
  reassignOrphanedPtoApprover: vi.fn(),
  submitPtoRequestWithConfirmation: vi.fn(),
  updateEmployeePtoDraftAsAdministrator: vi.fn(),
  updateOwnPtoDraft: vi.fn(),
}));

function requestForm({ confirmed = false }: { confirmed?: boolean } = {}) {
  const formData = new FormData();
  formData.set("employeeId", "507f1f77bcf86cd799439012");
  formData.set("category", "vacation");
  formData.set("collaboratorNote", "Descanso");
  formData.set("durationDays", "1");
  formData.set("endDate", "2026-09-14");
  formData.set("startDate", "2026-09-14");
  formData.set("confirmImmediateApproval", confirmed ? "true" : "false");
  return formData;
}

describe("administrator PTO creation action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createAndApprove.mockResolvedValue({
      id: "507f1f77bcf86cd799439099",
    });
  });

  it("does not create the request before immediate approval is confirmed", async () => {
    const result = await saveEmployeePtoDraftAction(
      initialPtoActionState,
      requestForm(),
    );

    expect(result).toMatchObject({ status: "warning" });
    expect(mocks.createAndApprove).not.toHaveBeenCalled();
  });

  it("creates an approved request and refreshes employee notification surfaces", async () => {
    await saveEmployeePtoDraftAction(
      initialPtoActionState,
      requestForm({ confirmed: true }),
    );

    expect(mocks.createAndApprove).toHaveBeenCalledWith("507f1f77bcf86cd799439012", {
      category: "vacation",
      collaboratorNote: "Descanso",
      endDate: "2026-09-14",
      requestedPortion: "full",
      startDate: "2026-09-14",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/ausencias");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/calendario");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(mocks.redirect).toHaveBeenCalledWith("/ausencias/507f1f77bcf86cd799439099");
  });
});
