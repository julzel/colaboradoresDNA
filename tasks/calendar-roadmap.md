# User story: Consult the calendar

## Status

**Status:** Implemented.

**Priority:** MVP.

**Primary role:** Any authenticated, active platform user.

**Route:** `/calendario`.

**Related specifications:**

- `tasks/done/platform-description.md`
- `tasks/done/employee-model.md`
- `tasks/done/async-ui-foundation.md`
- `docs/design-system.md`

## User story

As a collaborator, supervisor, or administrator, I want to consult relevant
events in an agenda or monthly calendar so that I can understand important
organization dates from any device.

## Product outcome

The `/calendario` route replaces its construction placeholder with a
mobile-first experience that offers exactly two views:

- **Agenda (`Agenda`):** a readable chronological list of entries in the
  selected month.
- **Month (`Mes`):** a monthly grid for understanding event distribution and
  inspecting the entries for a selected date.

The calendar combines birthdays already supported by the employee model with
organization events managed by administrators and supervisors. Authorized
users can open event details, while authorized managers can create, edit, and
delete events without changing either calendar view.

## Scope decisions

1. **Agenda** is the default on every device. This supports the mobile-first
   requirement and avoids deriving initial state from browser width during
   server rendering.
2. The selected view and month are represented in the URL:
   `?vista=agenda&mes=YYYY-MM` or `?vista=mes&mes=YYYY-MM`.
3. Week and day views are not implemented, and the interface does not render
   controls that suggest they are available.
4. Calendar weeks start on Monday.
5. Dates, month names, weekday names, controls, and messages render in Costa
   Rican Spanish using the `America/Costa_Rica` time zone.
6. Administrators and supervisors can create events. Administrators can manage
   every event; supervisors can manage events they organized and events
   directed to their current department.
7. Event deletion is a soft deletion. Deleted events disappear from calendar
   queries while audit history is preserved.
8. Do not add a general-purpose calendar library for this delivery. Build the
   two views with React, semantic HTML, native CSS, `Intl.DateTimeFormat`, and
   small tested date utilities.

## Data available for the first delivery

The employee domain already provides:

- `getBirthdayCalendarEntries()`.
- Birthdays stored as `birthMonth` and `birthDay`, without a birth year.
- The `employees_birthday_calendar` MongoDB index.
- Exclusion of employees whose employment is inactive.
- `shareBirthdayOnCalendar` enforcement for collaborators and supervisors.
- Administrator access to birthdays that are not shared publicly.

Birthday records must be adapted to a common calendar projection without
returning complete employee documents:

```ts
type CalendarEntry = {
  id: string;
  kind: "birthday";
  title: string;
  date: string;
  allDay: true;
};
```

The client projection must not contain personal email, phone, identification,
Clerk ID, platform role, department, unnecessary MongoDB identifiers, or other
profile data.

## Organization event data

An organization event contains:

- Title and optional description.
- Start and end in UTC.
- `America/Costa_Rica` as the presentation time zone.
- All-day status.
- Optional location and meeting URL.
- Visibility: company, department, or selected platform users.
- Organizer and selected visibility targets.
- Active or deleted status.
- Created, updated, and optional deleted timestamps.
- The platform user responsible for deletion.

All-day form dates are inclusive for users and stored as a UTC half-open range.
Timed form values are interpreted in Costa Rica time and persisted in UTC.

## Acceptance criteria

### 1. Access and authorization

1. Given an authenticated, active user, when they visit `/calendario`, they can
   consult only entries authorized for their role.
2. A signed-out user is redirected to sign-in.
3. A deactivated user cannot obtain calendar data by requesting the route or a
   server function directly.
4. Authorization and birthday privacy are enforced on the server and never
   depend solely on hiding client controls.
5. Collaborators and supervisors see only shared birthdays.
6. Administrators see all birthdays belonging to active employees, including
   birthdays hidden from the rest of the organization.

### 2. Header and date navigation

1. The page has one `h1` with the rendered text `Calendario`.
2. The header presents the visible period, `Anterior`, `Siguiente`, and `Hoy`
   actions, and an `Agenda` / `Mes` view selector.
3. Navigation actions have complete accessible Spanish names even when their
   visible treatment uses icons.
4. `Anterior` and `Siguiente` move one month at a time.
5. `Hoy` returns to the current month in the Costa Rica time zone.
6. Switching views preserves the selected month.
7. `vista` and `mes` survive reloads, browser history navigation, and shared
   links.
8. Missing or invalid parameters safely resolve to Agenda and the current
   month without causing a server error.

### 3. Agenda view

1. Agenda lists authorized entries in the selected month chronologically.
2. Entries are grouped by date under readable headings such as
   `martes 14 de julio`.
3. Every birthday includes a recognizable indicator, the employee display
   name, and the text `Cumpleaños`; meaning never relies on color alone.
4. Birthdays do not display a time because they are all-day entries.
5. Multiple entries on one date remain available and use a stable name order.
6. A month without visible entries renders `No hay eventos para este mes`.
7. Agenda does not render empty days.

### 4. Month view

1. Month displays the selected month in a seven-column grid.
2. The grid includes Monday-through-Sunday headers and any filler cells needed
   to preserve month alignment.
3. The current date has an accessible indication in addition to its visual
   styling.
4. Dates with entries render a summary appropriate for the available width.
5. On narrow screens, cells show the day number and compact event indicators;
   selecting a date renders its complete event list below the grid.
6. On wider screens, short titles may appear in cells, with a `Ver N más`
   control when the available space is exceeded.
7. Every entry remains reachable by keyboard and discoverable by assistive
   technology.
8. The grid does not require horizontal scrolling at 320 CSS pixels.

### 5. Responsive, mobile-first behavior

1. The base interface is designed for 320 CSS pixels and progressively enhanced
   for tablet and desktop.
2. On mobile, the calendar header may wrap into multiple rows without
   truncating the month or shrinking touch targets.
3. Interactive controls provide a minimum 44 by 44 CSS pixel touch target.
4. Agenda uses one column on narrow screens.
5. Month preserves its seven compact columns and moves details outside cells
   when space is limited.
6. The complete experience works at 200% zoom without losing content or
   actions.
7. Agenda and Month work in both light and dark themes.

### 6. Recurring dates and edge cases

1. Birthdays are annual recurrences and never expose birth year or age.
2. Date calculations must not use browser-local conversions that can move an
   entry to the previous or next calendar day.
3. A birthday registered as `29/02` appears on `28/02` in a non-leap year and
   includes the visible clarification `Fecha registrada: 29 de febrero`, so
   the adjustment is never silent.
4. Months with 28, 29, 30, and 31 days and months beginning on every weekday
   render correctly.

### 7. Loading, error, and empty states

1. `calendario/loading.tsx` keeps the workspace navigation visible and renders
   a skeleton matching the calendar content.
2. The loading region exposes accessible Spanish status text such as
   `Cargando calendario`.
3. `calendario/error.tsx` presents a safe Spanish explanation and retry action.
4. Moving between months provides local pending feedback without blocking the
   primary navigation.
5. An empty result is a valid state and is not presented as an error.
6. Errors never expose queries, internal identifiers, or MongoDB details.

### 8. Accessibility and content

1. All visible and accessible interface content renders in Spanish.
2. The view selector programmatically communicates which option is active.
3. Date navigation is keyboard operable and has visible focus.
4. Month uses understandable calendar/grid semantics and does not simulate a
   table with unnamed generic elements.
5. Selecting a date makes its details available to assistive technology
   without unexpectedly moving focus.
6. Entry type color is supplemental; every type also uses an icon or text.
7. Contrast meets WCAG 2.2 AA in light and dark themes.
8. Motion respects `prefers-reduced-motion`.

### 9. Performance and architecture

1. The page is primarily a Server Component.
2. Only controls requiring immediate interaction become Client Components.
3. The server fetches the required selected-month range and does not send
   complete employee documents to the client.
4. Both views consume the same normalized entry collection instead of
   duplicating business rules.
5. Calendar code follows the project's domain, server, and component
   conventions.
6. Initial client code does not include week views, day views, time grids, or
   drag-and-drop.

### 10. Event CRUD and authorization

1. Only administrators and supervisors can access the new-event route or invoke
   event mutations.
2. Administrators can create company, department, or invited-user events and
   manage any active event.
3. Supervisors can create company or invited-user events and can target only
   their current department when using department visibility.
4. Supervisors can update or delete events they organized and department
   events belonging to their current department.
5. Collaborators can open only event details visible to their company,
   department, or platform user.
6. Event forms support title, description, all-day or timed ranges, location,
   meeting URL, and visibility targets.
7. Server validation rejects invalid ranges, inactive departments, unavailable
   invitees, and unauthorized department targeting.
8. Create, update, and delete operations write safe audit entries containing
   field names rather than sensitive values.
9. Event mutation and audit insertion complete in one MongoDB transaction.
10. Deleting an event marks it deleted instead of removing its document.
11. Successful operations redirect with one safe Spanish toast; validation
    errors remain inline and preserve entered values.
12. Forms prevent duplicate submission, display pending state, and guard
    unsaved changes.

## Suggested structure

```text
web/src/
├── app/(workspace)/calendario/
│   ├── eventos/[eventId]/
│   │   ├── editar/page.tsx
│   │   └── page.tsx
│   ├── error.tsx
│   ├── loading.tsx
│   ├── nuevo/page.tsx
│   └── page.tsx
└── features/calendar/
    ├── actions/
    │   └── calendar-event-actions.ts
    ├── components/
    │   ├── calendar-agenda.tsx
    │   ├── calendar-controls.tsx
    │   ├── calendar-entry-item.tsx
    │   ├── calendar-event-form.tsx
    │   ├── calendar-month.tsx
    │   ├── calendar-month-day.tsx
    │   └── delete-calendar-event-form.tsx
    ├── domain/
    │   ├── calendar-entry.ts
    │   ├── calendar-event.ts
    │   ├── calendar-query.ts
    │   └── calendar-utils.ts
    └── server/
        ├── calendar-event-repository.ts
        ├── calendar-indexes.ts
        └── calendar-service.ts
```

Keep one component per file. Reuse existing buttons, elevated surfaces,
skeletons, and error states before introducing new primitives.

## Implementation roadmap

### Slice 1: Domain and query

- Define `CalendarEntry` and validate `vista` and `mes`.
- Adapt authorized birthdays to the common projection.
- Fetch only the selected month required by the page.
- Unit test ordering, privacy, month boundaries, and recurrence behavior.

### Slice 2: Mobile-first Agenda

- Replace the `/calendario` placeholder.
- Implement the header, month navigation, URL state, and Agenda.
- Add loading, error, and empty states.
- Verify 320 CSS pixels, keyboard navigation, and assistive technology.

### Slice 3: Month view

- Implement the Monday-first month grid.
- Add date selection and the below-grid mobile detail region.
- Progressively add in-cell desktop summaries.
- Verify responsive behavior and accessibility in both themes.

### Slice 4: Event CRUD

- Add the calendar event model, indexes, visibility query, and audit timeline.
- Add authorized create, detail, edit, and soft-delete routes.
- Aggregate visible organization events with birthdays.
- Test role, organizer, department, and invited-user boundaries.

### Slice 5: Future event sources

After the applicable domains exist:

- Add approved absences without exposing private request notes.
- Add type filters only when at least two real event sources exist.

Future sources must produce `CalendarEntry` and must not alter the Agenda or
Month contracts.

## Required tests

1. Unit tests cover URL parsing, month matrices, Monday-first alignment, month
   boundaries, stable ordering, and `es-CR` formatting.
2. Authorization tests cover active and deactivated users and administrator,
   supervisor, and collaborator roles.
3. Privacy tests cover shared and non-shared birthdays.
4. Component tests cover date navigation, view switching, date selection,
   loading, error, empty states, and conditional event fields.
5. Playwright covers Agenda and Month at 320, 768, and 1280 CSS pixels.
6. Integration tests cover visibility queries, transaction rollback, soft
   deletion, and direct mutation authorization.
7. Automated accessibility checks run in light and dark themes.
8. Formatting, linting, Stylelint, TypeScript, tests, and the production build
   pass.

## Non-goals

- Week and day views.
- Hour-by-hour timelines.
- Drag-and-drop or event resizing.
- External calendar invitations.
- Google Calendar, Outlook, or ICS synchronization.
- Reminders and notifications.
- Filters without multiple real data sources.
- Pending, denied, or draft absences.
- Private PTO request notes.

## Definition of done

The story is complete when `/calendario` provides Agenda and Month views backed
by real authorized birthday and organization-event data; authorized
administrators and supervisors can create, edit, and soft-delete events; the
experience works from 320 CSS pixels; view and month state remain in the URL;
all interface content renders in Spanish; and privacy, accessibility, and
automated quality requirements pass.
