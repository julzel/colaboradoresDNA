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
      screen.getByRole("heading", { name: "No hay actividades para este mes" }),
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
    expect(screen.getByText("No hay actividades para este día.")).toBeInTheDocument();
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
    expect(screen.queryByLabelText("Inicio")).not.toBeInTheDocument();

    await user.click(allDay);

    expect(allDay).not.toBeChecked();
    expect(screen.queryByLabelText("Fecha inicial")).not.toBeInTheDocument();
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

  it("offers predefined event types", () => {
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

    const eventType = screen.getByRole("combobox", { name: "Tipo de evento" });
    expect(eventType).toHaveTextContent("Capacitación");
    expect(eventType).toHaveTextContent("1:1");
    expect(eventType).toHaveTextContent("Celebración");
    expect(eventType).toHaveTextContent("Evento personalizado");
    expect(
      screen.queryByRole("checkbox", { name: "Ana Mora" }),
    ).not.toBeInTheDocument();
  });

  it("toggles optional event details without removing their fields", async () => {
    const user = userEvent.setup();
    render(
      <CalendarEventForm
        cancelHref="/calendario"
        mode="create"
        options={{ departments: [], people: [] }}
      />,
    );

    const location = screen.getByLabelText("Lugar");
    expect(location).not.toBeVisible();

    await user.click(screen.getByRole("button", { name: "Más" }));

    expect(location).toBeVisible();
    expect(screen.getByRole("button", { name: "Menos" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
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
