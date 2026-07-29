import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ProgressBar } from "@/components/ui/feedback/progress-bar";
import { Skeleton } from "@/components/ui/feedback/skeleton";
import { Spinner } from "@/components/ui/feedback/spinner";
import { SubmitButton } from "@/components/ui/feedback/submit-button";
import {
  createFeedbackUrl,
  feedbackMessages,
  isFeedbackMessageKey,
} from "@/lib/actions/feedback-messages";

describe("asynchronous UI foundations", () => {
  it("provides an accessible Spanish label for a standalone spinner", () => {
    render(<Spinner label="Cargando historial…" />);

    expect(
      screen.getByRole("status", { name: "Cargando historial…" }),
    ).toBeInTheDocument();
  });

  it("keeps skeleton content decorative", () => {
    const { container } = render(<Skeleton height="2rem" width="60%" />);

    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("exposes determinate progress values", () => {
    render(<ProgressBar label="Importando colaboradores" max={8} value={2} />);

    expect(
      screen.getByRole("progressbar", { name: "Importando colaboradores" }),
    ).toHaveAttribute("aria-valuenow", "2");
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("omits aria-valuenow for indeterminate progress", () => {
    render(<ProgressBar label="Cargando historial" />);

    expect(
      screen.getByRole("progressbar", { name: "Cargando historial" }),
    ).not.toHaveAttribute("aria-valuenow");
  });

  it("disables a submitting form control and shows its pending label", async () => {
    const user = userEvent.setup();
    let finishAction = () => {};
    const action = () =>
      new Promise<void>((resolve) => {
        finishAction = resolve;
      });

    render(
      <form action={action}>
        <SubmitButton pendingLabel="Guardando cambios…">Guardar cambios</SubmitButton>
      </form>,
    );

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(screen.getByRole("button", { name: "Guardando cambios…" })).toBeDisabled();

    await act(async () => {
      finishAction();
    });
  });

  it("maps only allow-listed feedback keys to safe Spanish text", () => {
    expect(isFeedbackMessageKey("invitation_sent")).toBe(true);
    expect(isFeedbackMessageKey("correo=persona@example.com")).toBe(false);
    expect(feedbackMessages.invitation_sent.message).toBe("La invitación fue enviada.");
    expect(createFeedbackUrl("/admin/accounts", "notice", "invitation_sent")).toBe(
      "/admin/accounts?notice=invitation_sent",
    );
  });
});
