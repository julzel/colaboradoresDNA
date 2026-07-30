import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CalendarAgenda } from "@/features/calendar/components/calendar-agenda";
import { CalendarCreateEventTrigger } from "@/features/calendar/components/calendar-create-event-trigger";
import { CalendarEventForm } from "@/features/calendar/components/calendar-event-form";
import { CalendarMonth } from "@/features/calendar/components/calendar-month";

const navigationMocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigationMocks,
}));

vi.mock("@/features/calendar/actions/calendar-event-actions", () => ({
  createCalendarEventAction: vi.fn(),
  updateCalendarEventAction: vi.fn(),
}));

describe("calendar views", () => {
  it("renders the agenda empty state in Spanish", () => {
    render(<CalendarAgenda entries={[]} month="2026-07" />);
    expect(
      screen.getByRole("heading", { name: "No hay eventos para este mes" }),
    ).toBeInTheDocument();
  });

  it("renders a six-week month grid and selected-day details", () => {
    render(
      <CalendarMonth
        entries={[]}
        query={{ day: "2026-07-13", month: "2026-07", view: "month" }}
      />,
    );

    expect(screen.getAllByRole("gridcell")).toHaveLength(42);
    expect(
      screen.getByRole("heading", { name: /lunes, 13 de julio de 2026/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("No hay eventos para este día.")).toBeInTheDocument();
  });
});

describe("calendar event form", () => {
  it("opens and closes event creation without navigating", async () => {
    const user = userEvent.setup();
    render(<CalendarCreateEventTrigger options={{ departments: [], people: [] }} />);

    expect(
      screen.queryByRole("dialog", { name: "Nuevo evento" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Nuevo evento" }));

    expect(screen.getByRole("dialog", { name: "Nuevo evento" })).toBeInTheDocument();
    expect(navigationMocks.back).not.toHaveBeenCalled();
    expect(navigationMocks.push).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(
      screen.queryByRole("dialog", { name: "Nuevo evento" }),
    ).not.toBeInTheDocument();
    expect(navigationMocks.back).not.toHaveBeenCalled();
    expect(navigationMocks.push).not.toHaveBeenCalled();
  });

  it("switches between all-day and timed inputs", async () => {
    const user = userEvent.setup();
    render(
      <CalendarEventForm
        cancelHref="/calendario"
        mode="create"
        options={{ departments: [], people: [] }}
      />,
    );

    const allDay = screen.getByRole("checkbox", {
      name: "Evento de todo el día",
    });
    expect(allDay).toBeChecked();
    expect(screen.getByLabelText("Fecha inicial")).toBeEnabled();
    expect(screen.getByLabelText("Inicio")).toBeDisabled();

    await user.click(allDay);

    expect(allDay).not.toBeChecked();
    expect(screen.getByLabelText("Fecha inicial")).toBeDisabled();
    expect(screen.getByLabelText("Inicio")).toBeEnabled();
  });

  it("reveals invited-person controls for invited visibility", async () => {
    const user = userEvent.setup();
    render(
      <CalendarEventForm
        cancelHref="/calendario"
        mode="create"
        options={{
          departments: [],
          people: [
            {
              displayName: "Ana Mora",
              id: "507f1f77bcf86cd799439011",
            },
          ],
        }}
      />,
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: "¿Quién puede verlo?" }),
      "invited",
    );

    expect(screen.getByRole("checkbox", { name: "Ana Mora" })).toBeEnabled();
  });

  it("closes a modal form through browser history", async () => {
    const user = userEvent.setup();
    render(
      <CalendarEventForm
        cancelBehavior="back"
        cancelHref="/calendario"
        mode="create"
        options={{ departments: [], people: [] }}
        presentation="modal"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(navigationMocks.back).toHaveBeenCalledOnce();
    expect(navigationMocks.push).not.toHaveBeenCalled();
  });
});
