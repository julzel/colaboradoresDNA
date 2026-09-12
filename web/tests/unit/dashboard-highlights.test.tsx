import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DashboardHighlights } from "@/features/dashboard/components/dashboard-highlights";
import type { CalendarEntry } from "@/features/calendar/domain/calendar-entry";

function entry(overrides: Partial<CalendarEntry>): CalendarEntry {
  return {
    allDay: false,
    canManage: true,
    description: null,
    detailHref: "/calendario/eventos/evento",
    endAt: "2026-09-04T16:30:00.000Z",
    endDate: "2026-09-04",
    id: "event:evento",
    kind: "event",
    label: "Evento personalizado",
    location: "Sala principal",
    meetingUrl: null,
    note: null,
    startAt: "2026-09-04T15:00:00.000Z",
    startDate: "2026-09-04",
    title: "Reunión de equipo",
    ...overrides,
  };
}

describe("dashboard highlights", () => {
  it("renders today's agenda and upcoming birthdays without a birthday index link", () => {
    render(
      <DashboardHighlights
        today="2026-09-04"
        todayAgenda={[entry({})]}
        upcomingBirthdays={[
          entry({
            allDay: true,
            detailHref: "/calendario/cumpleanos/persona/2026",
            id: "birthday:persona:2026",
            kind: "birthday",
            startDate: "2026-09-04",
            title: "María Fernández",
          }),
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Agenda de hoy" })).toBeVisible();
    expect(screen.getByRole("link", { name: /Reunión de equipo/ })).toHaveAttribute(
      "href",
      "/calendario/eventos/evento",
    );
    expect(screen.getByText("1 h 30 min")).toBeVisible();
    expect(screen.getByText("Sala principal")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Cumpleaños próximos" })).toBeVisible();
    expect(screen.getByRole("link", { name: /María Fernández/ })).toHaveAttribute(
      "href",
      "/calendario/cumpleanos/persona/2026",
    );
    expect(screen.getByText("Hoy")).toBeVisible();
    expect(screen.queryByText("Ver todos")).not.toBeInTheDocument();
  });

  it("shows the calendar label for an all-day entry without a location", () => {
    render(
      <DashboardHighlights
        today="2026-09-04"
        todayAgenda={[
          entry({
            allDay: true,
            detailHref: null,
            id: "holiday:2026-09-04",
            kind: "holiday",
            label: "Feriado nacional",
            location: null,
            title: "Feriado de prueba",
          }),
        ]}
        upcomingBirthdays={[]}
      />,
    );

    expect(screen.getByText("Todo el día")).toBeVisible();
    expect(screen.getByText("Feriado nacional")).toBeVisible();
  });

  it("can show upcoming birthdays without the agenda for collaborators", () => {
    render(
      <DashboardHighlights
        showAgenda={false}
        today="2026-09-04"
        todayAgenda={[entry({})]}
        upcomingBirthdays={[
          entry({
            allDay: true,
            detailHref: "/calendario/cumpleanos/persona/2026",
            id: "birthday:persona:2026",
            kind: "birthday",
            startDate: "2026-09-08",
            title: "María Fernández",
          }),
        ]}
      />,
    );

    expect(screen.queryByRole("heading", { name: "Agenda de hoy" })).toBeNull();
    expect(screen.queryByText("Reunión de equipo")).toBeNull();
    expect(screen.getByRole("heading", { name: "Cumpleaños próximos" })).toBeVisible();
    expect(screen.getByRole("link", { name: /María Fernández/ })).toBeVisible();
  });
});
