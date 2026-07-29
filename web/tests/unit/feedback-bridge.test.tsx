import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FeedbackBridge } from "@/components/ui/feedback/feedback-bridge";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  showFeedbackToast: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/accounts",
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams("notice=invitation_sent&vista=directorio"),
}));

vi.mock("@/components/ui/feedback/app-toast", () => ({
  showFeedbackToast: mocks.showFeedbackToast,
}));

describe("redirect feedback bridge", () => {
  beforeEach(() => {
    mocks.replace.mockClear();
    mocks.showFeedbackToast.mockClear();
  });

  it("shows an allow-listed message once and cleans only feedback parameters", async () => {
    render(<FeedbackBridge />);

    await waitFor(() => {
      expect(mocks.showFeedbackToast).toHaveBeenCalledWith("invitation_sent");
    });

    expect(mocks.showFeedbackToast).toHaveBeenCalledTimes(1);
    expect(mocks.replace).toHaveBeenCalledWith("/admin/accounts?vista=directorio", {
      scroll: false,
    });
  });
});
