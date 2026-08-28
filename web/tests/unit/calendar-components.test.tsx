import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CalendarAgenda } from "@/features/calendar/components/calendar-agenda";
import { CalendarCreateEventTrigger } from "@/features/calendar/components/calendar-create-event-trigger";
import { CalendarEventDetailContent } from "@/features/calendar/components/calendar-event-detail-content";
import { CalendarEventForm } from "@/features/calendar/components/calendar-event-form";
import { CalendarMonth } from "@/features/calendar/components/calendar-month";
import {
  CalendarBirthdayQuickDetailContent,
  CalendarPtoQuickDetailContent,
} from "@/features/calendar/components/calendar-quick-detail-content";
import type { CalendarEventDetail } from "@/features/calendar/view-models/calendar-event-view";

const navigationMocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigationMocks,
}));

vi.mock("@/features/calendar/actions/calendar-event-actions", () => ({
  createCalendarEventAction: vi.fn(),
  deleteCalendarEventAction: vi.fn(),
  updateCalendarEventAction: vi.fn(),
}));

describe("calendar views", () => {
  it("renders the agenda empty state in Spanish", () => {
    render(<CalendarAgenda entries={[]} month="2026-07" />);
    expect(
      screen.getByRole("heading", { name: "No hay actividades para este mes" }),
    ).toBeInTheDocument();
  });

  it("carries an event type into the agenda color hook", () => {
    render(
      <CalendarAgenda
        entries={[
          {
            allDay: false,
            canManage: false,
            description: null,
            detailHref: "/calendario/eventos/event-1",
            endAt: "2026-07-13T16:00:00.000Z",
            endDate: "2026-07-13",
            eventType: "one_on_one",
            id: "event:event-1",
            kind: "event",
            label: "1:1",
            location: null,
            meetingUrl: null,
            note: null,
            startAt: "2026-07-13T15:00:00.000Z",
            startDate: "2026-07-13",
            title: "Seguimiento semanal",
          },
        ]}
        month="2026-07"
      />,
    );

    expect(screen.getByText("1:1").closest("article")).toHaveAttribute(
      "data-event-type",
      "one_on_one",
    );
  });

  it("keeps the event link in the detail view instead of the agenda row", () => {
    render(
      <CalendarAgenda
        entries={[
          {
            allDay: false,
            canManage: false,
            description: null,
            detailHref: "/calendario/eventos/event-1",
            endAt: "2026-07-13T16:00:00.000Z",
            endDate: "2026-07-13",
            eventType: "one_on_one",
            id: "event:event-1",
            kind: "event",
            label: "1:1",
            location: null,
            meetingUrl: "https://meet.example.com/weekly",
            note: null,
            startAt: "2026-07-13T15:00:00.000Z",
            startDate: "2026-07-13",
            title: "Seguimiento semanal",
          },
        ]}
        month="2026-07"
      />,
    );

    expect(screen.queryByRole("link", { name: /abrir enlace/i })).toBeNull();
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

  it("builds the month legend and selected-day actions from visible entries", () => {
    render(
      <CalendarMonth
        canCreateEvents
        entries={[
          {
            allDay: true,
            canManage: false,
            description: null,
            detailHref: "/calendario/cumpleanos/person/2026",
            endAt: "2026-07-14T06:00:00.000Z",
            endDate: "2026-07-13",
            id: "birthday:person:2026",
            kind: "birthday",
            label: "Cumpleaños",
            location: null,
            meetingUrl: null,
            note: null,
            startAt: "2026-07-13T06:00:00.000Z",
            startDate: "2026-07-13",
            title: "Ana Mora",
          },
          {
            allDay: true,
            canManage: false,
            description: null,
            detailHref: "/calendario/ausencias/request",
            endAt: "2026-07-14T06:00:00.000Z",
            endDate: "2026-07-13",
            id: "pto:request",
            kind: "pto",
            label: "Ausencia · 1 día",
            location: null,
            meetingUrl: null,
            note: null,
            startAt: "2026-07-13T06:00:00.000Z",
            startDate: "2026-07-13",
            title: "Luis Vargas",
          },
        ]}
        eventFormOptions={{ departments: [], people: [] }}
        query={{ day: "2026-07-13", month: "2026-07", view: "month" }}
      />,
    );

    expect(
      screen.getByRole("region", { name: "Leyenda del calendario" }),
    ).toHaveTextContent("Cumpleaños");
    expect(
      screen.getByRole("region", { name: "Leyenda del calendario" }),
    ).toHaveTextContent("Ausencias");
    expect(screen.getByText("2 eventos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nuevo evento" })).toHaveTextContent(
      "Nuevo evento",
    );
  });
});

describe("calendar event detail", () => {
  it("shows a concise summary and keeps the meeting link with the event details", () => {
    const detail: CalendarEventDetail = {
      canDelete: true,
      canManage: true,
      departmentName: "Producción",
      event: {
        allDay: false,
        createdAt: "2026-07-01T12:00:00.000Z",
        departmentId: "507f1f77bcf86cd799439011",
        description: "Revisión de objetivos y próximos pasos.",
        endDate: "2026-07-13",
        endLocal: "2026-07-13T10:00",
        endsAt: "2026-07-13T16:00:00.000Z",
        eventType: "one_on_one",
        id: "507f1f77bcf86cd799439012",
        inviteePlatformUserIds: ["507f1f77bcf86cd799439013"],
        location: "Sala Norte",
        meetingUrl: "https://meet.example.com/weekly",
        organizerPlatformUserId: "507f1f77bcf86cd799439014",
        startDate: "2026-07-13",
        startLocal: "2026-07-13T09:00",
        startsAt: "2026-07-13T15:00:00.000Z",
        title: "Seguimiento semanal",
        updatedAt: "2026-07-01T12:00:00.000Z",
        visibility: "invited",
      },
      invitees: [{ displayName: "Ana Mora", id: "507f1f77bcf86cd799439013" }],
      organizerName: "Julio Zeledon",
    };

    render(
      <CalendarEventDetailContent
        detail={detail}
        developmentHref="/admin/colaboradores/employee/desarrollo/1-a-1/meeting"
      />,
    );

    expect(screen.getByText("1:1")).toBeInTheDocument();
    expect(screen.getByText("Julio Zeledon")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Abrir enlace del evento" }),
    ).toHaveAttribute("href", "https://meet.example.com/weekly");
    expect(screen.getByText("1 persona invitada")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Editar evento" })).toHaveAttribute(
      "href",
      "/calendario/eventos/507f1f77bcf86cd799439012/editar",
    );
    expect(screen.getByText("Eliminar evento")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Abrir registro de desarrollo" }),
    ).toHaveAttribute("href", "/admin/colaboradores/employee/desarrollo/1-a-1/meeting");
  });
});

describe("calendar quick details", () => {
  it("links a leave summary to the complete request", () => {
    render(
      <CalendarPtoQuickDetailContent
        detail={{
          categoryLabel: "Vacaciones",
          durationLabel: "1,5",
          endDate: "2026-07-12",
          id: "507f1f77bcf86cd799439099",
          requesterName: "Ana Mora",
          startDate: "2026-07-11",
          statusLabel: "Aprobada",
        }}
      />,
    );

    expect(screen.getByText("Vacaciones")).toBeInTheDocument();
    expect(screen.getByText(/1,5/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ver solicitud completa" }),
    ).toHaveAttribute("href", "/ausencias/507f1f77bcf86cd799439099");
  });

  it("shows a birthday summary without exposing an employee record link", () => {
    render(
      <CalendarBirthdayQuickDetailContent
        detail={{
          date: "2026-02-28",
          displayName: "Ana Mora",
          note: "Fecha registrada: 29 de febrero.",
        }}
      />,
    );

    expect(screen.getByText("Cumpleaños")).toBeInTheDocument();
    expect(screen.getByText(/sábado, 28 de febrero de 2026/i)).toBeInTheDocument();
    expect(screen.getByText("Fecha registrada: 29 de febrero.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("calendar event form", () => {
  it("simplifies a Development-linked 1:1 editor to its protected schedule", () => {
    render(
      <CalendarEventForm
        cancelHref="/calendario/eventos/507f1f77bcf86cd799439012"
        developmentOneOnOne
        event={{
          allDay: false,
          createdAt: "2026-08-01T12:00:00.000Z",
          departmentId: null,
          description: null,
          endDate: "2026-08-10",
          endLocal: "2026-08-10T09:30",
          endsAt: "2026-08-10T15:30:00.000Z",
          eventType: "one_on_one",
          id: "507f1f77bcf86cd799439012",
          inviteePlatformUserIds: ["507f1f77bcf86cd799439013"],
          location: null,
          meetingUrl: null,
          organizerPlatformUserId: "507f1f77bcf86cd799439011",
          startDate: "2026-08-10",
          startLocal: "2026-08-10T09:00",
          startsAt: "2026-08-10T15:00:00.000Z",
          title: "Reunión 1:1",
          updatedAt: "2026-08-01T12:00:00.000Z",
          visibility: "invited",
        }}
        mode="edit"
        options={{ departments: [], people: [] }}
      />,
    );

    expect(screen.getByText("Evento privado vinculado a Desarrollo")).toBeVisible();
    expect(screen.getByLabelText("Inicio")).toHaveValue("2026-08-10T09:00");
    expect(screen.getByLabelText("Final")).toHaveValue("2026-08-10T09:30");
    expect(screen.queryByLabelText("Tipo de evento")).toBeNull();
    expect(screen.queryByLabelText("Título")).toBeNull();
    expect(screen.queryByLabelText("¿Quién puede verlo?")).toBeNull();
    expect(screen.queryByLabelText("Evento de todo el día")).toBeNull();
  });

  it("opens and closes event creation without navigating", async () => {
    const user = userEvent.setup();
    render(<CalendarCreateEventTrigger options={{ departments: [], people: [] }} />);

    expect(
      screen.queryByRole("dialog", { name: "Nuevo evento" }),
    ).not.toBeInTheDocument();

    const createEventButton = screen.getByRole("button", { name: "Nuevo evento" });
    expect(createEventButton).not.toHaveTextContent("Nuevo evento");

    await user.click(createEventButton);

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
