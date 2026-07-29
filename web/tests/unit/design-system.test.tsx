import { render, screen } from "@testing-library/react";
import { House } from "lucide-react";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/button/button";
import { TextField } from "@/components/ui/form-field/form-field";
import { SideNavigation } from "@/components/ui/navigation/side-navigation";

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
});
