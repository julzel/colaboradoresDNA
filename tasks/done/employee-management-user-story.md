# User story: Manage employees

## Status

**Status:** Ready for implementation.

**Priority:** MVP.

**Primary role:** Administrator.

**Related specifications:**

- `tasks/employee-design.md`
- `tasks/done/employee-model.md`
- `tasks/done/async-ui-foundation.md`
- `docs/design-system.md`

## User story

As an administrator, I want to find, review, create, and update employee records
so that personal information, organizational assignment, work schedule,
employment status, and platform access remain accurate without losing history
or exposing sensitive information.

## Product outcome

Administrators can manage the employee lifecycle from one coherent area while:

- Keeping Clerk identity and platform access separate from employee data.
- Preserving assignment and schedule history.
- Applying all validation and authorization on the server.
- Receiving accessible Spanish feedback for every meaningful operation.
- Using the complete workflow on desktop, tablet, and mobile.

## Preconditions

- Clerk authentication and administrator authorization are operational.
- The employee model foundation is deployed.
- `pnpm bootstrap:employee-model` has created the required indexes and initial
  departments in the target environment.
- The asynchronous UI foundation is available.

## In scope

### Routes

```text
/admin/colaboradores
/admin/colaboradores/nuevo
/admin/colaboradores/[employeeId]
/admin/colaboradores/[employeeId]/editar/informacion-personal
/admin/colaboradores/[employeeId]/editar/asignacion
/admin/colaboradores/[employeeId]/editar/horario
/admin/colaboradores/[employeeId]/editar/acceso
```

### Capabilities

- Searchable and filterable employee directory.
- Read-only employee detail.
- Five-step employee creation.
- Personal-information editing.
- Effective-dated assignment changes.
- Effective-dated schedule changes.
- Invitation and platform-access management.
- Employment deactivation with fail-closed access.
- Assignment and schedule history.
- Masked identification with separately authorized reveal.

## Acceptance criteria

### 1. Authorization

1. Given an authenticated administrator, when they visit an employee-management
   route, then the server authorizes access and returns only administrator-safe
   data.
2. Given a supervisor, collaborator, signed-out user, or deactivated account,
   when they request an employee-management page or Server Action directly,
   then the server denies or redirects them without returning employee data.
3. Hiding a control is never the only authorization check.

### 2. Directory

1. The directory displays employee name, current department, current position,
   current manager, platform role, employment status, and access status.
2. The directory does not return or render phone, birthday, identification,
   normalized values, Clerk IDs, invitation IDs, or raw MongoDB IDs.
3. Administrators can search by name.
4. Administrators can filter by department, employment status, access status,
   and platform role.
5. Administrators can sort by name or employment start date.
6. Search, filters, sort, and page are represented in the URL and survive
   reload, browser navigation, and return from detail.
7. The page distinguishes `No hay colaboradores registrados` from
   `No encontramos resultados con estos filtros`.
8. The employee name is a normal link to the detail page, and row actions are
   keyboard reachable without relying on hover.

### 3. Detail

1. The detail header shows canonical full name, profile image or initials,
   current position and department, employment status, and access status.
2. Personal, employment, assignment, schedule, access, and history are
   presented as read-only semantic summaries rather than disabled fields.
3. Missing optional values render `No indicado` or `Sin asignar`, as
   appropriate.
4. Birthday renders as `dd/MM`; no birth year or age is returned or displayed.
5. Schedule displays all seven weekdays and the derived weekly days and hours.
6. Assignment and schedule history are shown newest first without overwriting
   previous records.
7. Platform and Clerk internal identifiers are not displayed.

### 4. Identification safety

1. Employee detail initially displays only the identification type and masked
   suffix.
2. The complete identification value is absent from the initial detail-page
   payload.
3. `Mostrar identificación` performs a separate administrator-authorized
   request.
4. The revealed value is not included in URLs, logs, analytics, audit metadata,
   feedback, or client cache keys.
5. The reveal control has a clear accessible name and does not persist the
   value after leaving the record.

### 5. Employee creation

1. `Nuevo colaborador` opens a five-step full-page flow:
   `Información personal`, `Información laboral y acceso`, `Asignación`,
   `Horario`, and `Revisar y crear`.
2. The flow validates the active step before advancing and preserves data when
   moving backward.
3. Birthday accepts valid `dd/MM` combinations, including `29/02`, without a
   year.
4. Cédula and DIMEX use the approved validation and normalization rules.
5. The manager selector includes only active supervisors and administrators
   and excludes the employee being created.
6. The schedule includes all seven days exactly once and updates derived weekly
   days and hours before submission.
7. The review step presents read-only summaries with accessible `Cambiar`
   actions that return to the selected step.
8. Final submission creates or links the platform user, employee, initial
   assignment, and initial schedule without partial business records.
9. A successful creation synchronizes the canonical display name, records safe
   audit entries, and sends the Clerk invitation to the personal email.
10. If invitation delivery fails, the employee and invited access record remain
    recoverable and the UI provides a safe resend action.
11. A duplicate platform linkage or identification returns a safe Spanish
    validation outcome without exposing the conflicting record.
12. Leaving a creation flow with entered data requires discard confirmation.

### 6. Personal-information editing

1. The edit route starts with the current saved values.
2. Administrators can edit names, birthday, sharing preference, phone display
   value, identification type, and identification display value.
3. Normalized values are never editable or rendered as form inputs.
4. Save validates on the server and focuses an error summary or the first
   invalid field after failure.
5. Expected errors preserve entered values and do not close the form.
6. Successful save updates the canonical employee name and the denormalized
   platform access display name in one controlled operation.
7. Successful save returns to detail and shows one safe Spanish toast.

### 7. Assignment editing

1. Administrators edit department, free-text position, manager, and
   `Vigente desde` together.
2. Only active departments are selectable for a new assignment.
3. Only active supervisors and administrators are selectable as managers.
4. Self-management and reporting cycles are rejected by the server.
5. Saving closes the applicable current assignment and creates a new
   effective-dated record.
6. Overlapping effective periods are rejected, including concurrent requests.
7. The previous assignment remains visible in history.
8. Platform role is never inferred from department, position, or manager.

### 8. Schedule editing

1. Every weekday offers `Día completo`, `Medio día`, or `No trabaja`.
2. A half-day requires `Mañana` or `Tarde`; other fractions do not accept a
   period.
3. The UI displays real derived weekly days and hours before saving.
4. Administrators provide `Vigente desde`.
5. Saving closes the applicable current schedule and creates a new
   effective-dated record.
6. Overlapping effective periods are rejected, including concurrent requests.
7. Future-dated changes are accepted and visible.
8. The previous schedule remains visible in history.

### 9. Access and employment lifecycle

1. Invitation resend is available only for an eligible invited account.
2. Access status and employment status are displayed and managed separately.
3. `Finalizar relación laboral` requires an employment end date and a
   confirmation summarizing that access and sessions will be revoked.
4. Confirmation defaults focus to the non-destructive action.
5. A successful operation marks employment inactive, closes current assignment
   and schedule periods, deactivates platform access, and requests Clerk session
   revocation.
6. If Clerk is unavailable, MongoDB still denies access and records
   synchronization as pending.
7. No employee, assignment, schedule, access history, or audit record is hard
   deleted.
8. Reactivating platform access does not reactivate employment.

### 10. Save, Cancel, and asynchronous feedback

1. Each form has visible `Guardar cambios` and `Cancelar` actions.
2. Submit buttons disable immediately and show a specific Spanish pending label.
3. Duplicate submissions do not create duplicate records.
4. Cancel exits immediately when nothing changed.
5. Cancel or navigation with unsaved changes requests discard confirmation.
6. Success produces one Spanish toast and refreshed server state.
7. Field errors remain inline; a toast never replaces validation.
8. Sensitive or provider values never appear in feedback.
9. Assignment, schedule, identification, role, access, and employment changes
   are not optimistic.

### 11. Responsive behavior

1. The complete workflow is usable at 320 CSS pixels and 200% zoom.
2. Desktop shows the complete management table without making the detail a
   modal or drawer.
3. Lower-priority columns may be hidden on smaller widths while name,
   department, and statuses remain available.
4. When a table is no longer understandable, mobile uses a semantic compact
   list with the same routes and behavior.
5. Forms use one column on narrow screens and do not require horizontal
   scrolling.
6. Returning from detail restores directory query state and scroll position
   when practical.

### 12. Accessibility and language

1. All rendered interface text, validation, empty states, pending labels,
   confirmations, and feedback are Spanish.
2. Pages use one descriptive `h1` and logical heading order.
3. Every form field has a programmatic label and connected helper or error text.
4. All actions are operable by keyboard with visible focus.
5. Modal confirmations move and contain focus, support Escape when safe, and
   return focus to their trigger.
6. Status never relies on color alone.
7. Loading skeletons are decorative and their region exposes an accessible
   Spanish loading status.
8. Light and dark themes pass the existing automated accessibility checks.

### 13. Testing and quality

1. Unit tests cover form mapping, validation messages, schedule totals, safe
   projections, and URL filter parsing.
2. Authorization tests cover every page and mutation role boundary.
3. Integration tests cover creation transactions, uniqueness, reporting-cycle
   rejection, overlap rejection, and fail-closed deactivation.
4. Component tests cover Save/Cancel, dirty-state confirmation, error focus,
   pending controls, and identification reveal.
5. Playwright covers directory → detail, creation, editing, deactivation,
   responsive keyboard use, and accessibility in both themes.
6. Formatting, linting, CSS validation, TypeScript, tests, and the production
   build pass.

## Non-goals

- Employee self-service profile UI.
- Quick-preview drawer.
- Editable directory cells.
- Batch changes.
- Export or configurable columns.
- General identification or phone search.
- Persistent creation drafts.
- Historical correction interface.
- PTO balances or requests.
- Automatic PTO duration from schedules or holidays.

## Suggested implementation slices

1. Directory query, URL filters, table/list, and navigation.
2. Read-only detail with safe projections and histories.
3. Personal-information edit and separately authorized identification reveal.
4. Assignment and schedule edits.
5. Five-step creation and invitation orchestration.
6. Employment deactivation and access lifecycle integration.
7. Responsive, accessibility, and complete journey testing.

Each slice must remain server-authorized and independently testable.
