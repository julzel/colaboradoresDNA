import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DashboardWelcome } from "@/features/dashboard/components/dashboard-welcome";

describe("dashboard welcome", () => {
  it("renders the shared greeting using the person's first name", () => {
    render(
      <DashboardWelcome
        date={{ iso: "2026-09-06", label: "Domingo, 6 de septiembre 2026" }}
        displayName="Ana Mora"
      />,
    );

    expect(screen.getByText("Domingo, 6 de septiembre 2026")).toHaveAttribute(
      "datetime",
      "2026-09-06",
    );
    expect(screen.getByRole("heading", { name: "Hola, Ana" })).toBeVisible();
    expect(
      screen.getByText("Aquí tienes un resumen de lo más importante para hoy"),
    ).toBeVisible();
  });
});
