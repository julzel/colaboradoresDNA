import { render, screen } from "@testing-library/react";
import { CalendarDays, House } from "lucide-react";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/button/button";
import { TextField } from "@/components/ui/form-field/form-field";
import { MetricCard } from "@/components/ui/metric-card/metric-card";
import { BackLink } from "@/components/ui/navigation/back-link";
import { SideNavigation } from "@/components/ui/navigation/side-navigation";
import { PageSectionHeader } from "@/components/ui/page-section-header/page-section-header";

describe("design-system foundations", () => {
  it("renders a button with native button semantics", () => {
    render(<Button>Save changes</Button>);

    expect(screen.getByRole("button", { name: "Save changes" })).toHaveAttribute(
      "type",
      "button",
    );
  });

  it("connects field errors to their input", () => {
    render(
      <TextField
        error="Enter a collaborator name"
        id="collaborator"
        label="Collaborator"
      />,
    );

    const input = screen.getByRole("textbox", { name: "Collaborator" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Enter a collaborator name");
  });

  it("marks the current navigation destination", () => {
    render(
      <SideNavigation
        currentHref="/"
        items={[{ href: "/", icon: House, label: "Overview" }]}
      />,
    );

    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("renders a reusable back destination with one accessible label", () => {
    render(<BackLink href="/colaboradores">Volver a colaboradores</BackLink>);

    expect(
      screen.getByRole("link", { name: "Volver a colaboradores" }),
    ).toHaveAttribute("href", "/colaboradores");
  });

  it("renders the shared page section heading and its optional action", () => {
    render(
      <PageSectionHeader
        action={<Button>Nueva solicitud</Button>}
        icon={CalendarDays}
        title="Calendario"
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Calendario" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Nueva solicitud" })).toBeVisible();
  });

  it("renders a reusable dashboard metric card", () => {
    render(<MetricCard label="Pendientes" value={5} />);

    expect(screen.getByText("Pendientes")).toBeVisible();
    expect(screen.getByText("5")).toBeVisible();
  });
});
