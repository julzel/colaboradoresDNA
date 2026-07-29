# Employee management UI/UX design

## Document status

**Status:** Refined and ready for implementation planning.

**Scope:** Administrator employee directory, employee detail, creation,
section-level editing, effective-dated changes, and employment lifecycle.

**Related decisions:**

- `tasks/done/employee-model.md`
- `tasks/done/async-ui-foundation.md`
- `docs/design-system.md`

All interface text must be Spanish. Code, routes, domain keys, and identifiers
remain English except for the approved Spanish public route segment
`colaboradores`.

## Review of the initial proposal

The initial master-detail proposal made several sound decisions:

- Use a table for desktop discovery and comparison.
- Default the employee record to read-only.
- Use explicit Save and Cancel actions.
- Keep routes URL-driven and bookmarkable.
- Preserve directory state when returning from a record.
- Avoid disabled inputs, editable tables, and long modal forms.

The proposal needed refinement because it treated an employee as one short,
flat form. The implemented model separates:

- Personal and employment information in `employees`.
- Department, position, and manager in effective-dated assignments.
- Weekly work pattern in effective-dated schedules.
- Role, personal email, invitation, and access status in `platform_users`.

That complexity makes a persistent side panel and whole-record edit mode a poor
primary interface. The original directory also exposed identification and phone
information too prominently and suggested decisions that conflict with the
approved model:

- Every employee must have a linked platform user; `platformUserId` is not
  nullable.
- Identification is not a general directory search field.
- Phone numbers and full identification values do not belong in the directory.
- Assignment and schedule changes preserve history instead of overwriting one
  record.
- Creating an employee includes access, assignment, and schedule, so it is long
  enough to justify a guided multi-step flow.

## Final interaction model

Use:

1. A data-table directory for finding and comparing employees.
2. A dedicated read-only detail page as the canonical employee record.
3. Dedicated section-edit routes for personal information, assignment,
   schedule, and access/lifecycle.
4. A multi-step full-page flow for employee creation.
5. Modal dialogs only for short confirmations.
6. No drawer in the initial implementation.

A nonmodal desktop preview drawer may be evaluated later if user research shows
that administrators frequently inspect several employees without needing the
complete record. It must never become the only way to access employee details.

## Information architecture and routes

```text
/admin/colaboradores
/admin/colaboradores/nuevo
/admin/colaboradores/[employeeId]
/admin/colaboradores/[employeeId]/editar/informacion-personal
/admin/colaboradores/[employeeId]/editar/asignacion
/admin/colaboradores/[employeeId]/editar/horario
/admin/colaboradores/[employeeId]/editar/acceso
```

Each route is bookmarkable and reload-safe. The directory's search, filters,
sort, and page use URL search parameters. Returning from detail or edit must
restore that directory state.

## Employee directory

### Purpose

The directory helps administrators:

- Find a specific employee.
- Scan employment and access status.
- Compare current organizational placement.
- Navigate to employee detail or creation.

### Desktop columns

| Column           | Content                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------- |
| Colaborador      | Profile image or initials, full name, personal email as secondary administrator-only text |
| Departamento     | Current effective department                                                              |
| Puesto           | Current effective free-text position                                                      |
| Jefatura directa | Current effective manager or `Sin asignar`                                                |
| Rol              | Platform role                                                                             |
| Estado laboral   | `Activo` or `Inactivo`                                                                    |
| Acceso           | `Invitado`, `Activo`, or `Desactivado`                                                    |
| Acciones         | Contextual overflow menu                                                                  |

Do not display phone number, birthday, identification, raw IDs, complete
schedule, or normalized values in the directory.

The employee name is a normal link to the detail route. Do not make the entire
row a button because the row contains other actions and status information.

### Search and filters

The toolbar contains:

- Search by employee name.
- Department filter.
- Employment-status filter.
- Access-status filter.
- Platform-role filter.
- Sort by name or employment start date.
- Result count.
- `Nuevo colaborador` as the primary action.
- `Limpiar filtros` when filters are active.

Identification and phone are not searchable in the general directory without
a later approved operational requirement.

Example URL:

```text
/admin/colaboradores?search=ana&department=...&employment=active&page=2
```

Filtering, sorting, and pagination occur on the server. The empty state
distinguishes between no employees and no matches for the current filters.

### Row actions

The overflow menu may include:

- `Ver detalle`.
- `Editar información personal`.
- `Cambiar asignación`.
- `Cambiar horario`.
- `Gestionar acceso`.
- `Reenviar invitación` when applicable.
- `Finalizar relación laboral` when applicable.

Do not place destructive actions as always-visible row buttons.

## Employee detail

The canonical route is `/admin/colaboradores/[employeeId]`.

### Header

Show:

- Clerk profile image or employee initials.
- Canonical full name.
- Current position and department.
- Employment-status badge.
- Access-status badge.
- Primary `Editar` action or a compact section-action menu.
- `Más acciones` for invitation and lifecycle operations.

Employment status and platform-access status remain visibly separate.

### Read-only sections

Use semantic label/value summaries, not disabled form controls.

#### Información personal

- Nombre.
- Primer apellido.
- Segundo apellido or `No indicado`.
- Cumpleaños as `dd/MM`.
- Birthday calendar preference.
- Phone number or `No indicado`.
- Identification type.
- Masked identification.

The full identification value is not included in the initial page response. An
administrator-only `Mostrar identificación` action performs a separately
authorized server request. The revealed value is temporary and must not be
placed in the URL, analytics, logs, or client cache keys.

#### Información laboral

- Employment status.
- Employment start date.
- Employment end date only when applicable.

#### Asignación actual

- Department.
- Position.
- Direct manager or `Sin asignar`.
- Effective-from date.
- Link or disclosure for assignment history.

#### Horario vigente

- Seven-day weekly pattern.
- Morning or afternoon for half-days.
- Derived weekly days and hours.
- Effective-from date.
- Link or disclosure for schedule history.

#### Acceso a la plataforma

- Personal login email.
- Platform role.
- Access or invitation status.
- Last invitation date when relevant.
- Account-management actions appropriate to the current status.

Do not expose `platformUserId`, Clerk IDs, invitation IDs, or normalized email as
ordinary profile information.

#### Historial y auditoría

Show assignment and schedule history in reverse chronological order. A safe
audit timeline may show action, actor, changed field names, and timestamp, but
never identification, phone, birthday, invitation URL, or authentication
values.

Use vertical sections with an optional desktop anchor index. Avoid tabs in the
first implementation because they hide information and complicate navigation,
deep linking, and mobile behavior.

## Editing existing employees

Do not turn the complete employee detail page into one form. Each section has
an explicit edit action and a dedicated route.

### Personal-information edit

Edits:

- Given names.
- First and second surname.
- Birthday day and month.
- Birthday calendar preference.
- Phone display value.
- Identification type and display value.

Normalized identification and phone values are calculated by the server and
never appear as editable fields.

### Assignment edit

Edits together:

- Department.
- Position.
- Direct manager.
- `Vigente desde`.

Saving closes the current assignment when necessary and creates a new
effective-dated record. Before saving, explain that the previous assignment
will remain in history. Only active supervisors and administrators are
selectable as managers, and the current employee is excluded.

Historical correction is a separate advanced operation and is not presented as
a normal current-assignment change.

### Schedule edit

Show each weekday with:

- `Día completo`.
- `Medio día`.
- `No trabaja`.
- `Mañana` or `Tarde` only when `Medio día` is selected.

Display the derived weekly total immediately:

```text
3.5 días · 28 horas semanales
```

Require `Vigente desde` and explain that the current schedule remains in
history. Do not implement the schedule as a spreadsheet-style editable grid.

### Access and lifecycle edit

Manage:

- Platform role.
- Invitation resend.
- Access deactivation/reactivation.
- Employment deactivation through a dedicated action.

Ending employment is not a normal status select. Use
`Finalizar relación laboral`, require an end date, summarize the consequences,
and request confirmation. The operation must:

1. Mark employment inactive.
2. Close current assignment and schedule periods.
3. Deactivate platform access.
4. Revoke Clerk sessions.
5. Preserve all history.

Reactivating platform access must not silently reactivate employment.

### Save and Cancel

Every edit form:

- Starts with saved values.
- Uses inline validation in Spanish.
- Focuses an error summary or the first invalid field after failure.
- Has specific `Guardar cambios` and `Cancelar` actions.
- Shows a specific pending label such as `Guardando horario…`.
- Prevents duplicate submissions.
- Remains open and preserves values after expected errors.
- Returns to the read-only detail section after success.
- Shows one safe Spanish success toast.

Cancel exits immediately when nothing changed. If values changed, ask whether
to discard them. Navigation to another route receives the same unsaved-change
protection.

Do not optimistically update identification, assignment, schedule, role,
employment status, access, or invitation state.

## Employee creation

Creation uses a full-page five-step flow:

1. `Información personal`
2. `Información laboral y acceso`
3. `Asignación`
4. `Horario`
5. `Revisar y crear`

The sequence matches the linked records created by the transaction and
invitation workflow. A stepper is appropriate for creation but not for editing
an existing employee.

### Step behavior

- Validate the current step before advancing.
- Preserve completed values when moving backward.
- Show the active step and overall progress.
- Do not claim that an employee exists before final submission succeeds.
- The review step uses read-only summaries with section-specific `Cambiar`
  actions.
- `Crear colaborador` performs the final mutation.

The final operation creates or links the platform access record, employee,
initial assignment, and initial schedule, then sends the Clerk invitation. If
invitation delivery fails, preserve the recoverable invited record and provide
a safe resend path.

Draft persistence across sessions is outside the first implementation. Warn
before abandoning a creation flow that contains entered data.

## Modal and drawer decisions

### Modal dialogs

Use a modal only for focused decisions:

- Confirm ending employment.
- Confirm discarding unsaved changes.
- Confirm a sensitive access operation.

The modal must move focus inside, contain keyboard focus, close with Escape when
safe, provide a visible cancel action, and return focus to its trigger.

Do not use a modal for complete employee, assignment, or schedule forms.

### Drawers

Do not implement a persistent or temporary employee drawer in the MVP. A drawer
would duplicate the canonical detail route while providing insufficient room
for effective histories and section forms. A future nonmodal desktop preview
may show a small read-only summary and link to the complete detail page.

## Responsive behavior

Desktop has priority, but every management task remains usable at 320 CSS
pixels and at 200% zoom.

### Large desktop

- Full data table.
- Persistent search and filters.
- Two-column field groupings where reading order remains clear.
- Optional sticky section index.
- Sticky form action bar for long schedule or creation steps.

### Small desktop and tablet

- Hide lower-priority directory columns.
- Keep employee, department, and statuses visible.
- Move secondary filters into a `Filtros` control.
- Detail and edit remain full-width routes.

### Mobile

- Use a compact semantic employee list when the table no longer communicates
  clearly.
- Stack fields in one column.
- Use full-page detail, creation, and edit routes.
- Keep primary form actions reachable without horizontal scrolling.
- Preserve directory query state when returning.

Do not create a mobile-only workflow with different business behavior.

## Permissions and data safety

- Every page, Server Action, and query authenticates and authorizes on the
  server.
- Only administrators access the employee-management routes.
- Supervisors and collaborators do not receive sensitive fields merely because
  a control is hidden.
- Employee self-service phone, profile image, and birthday-sharing controls are
  a separate profile story.
- Directory responses exclude phone, birthday, and identification.
- Identification reveal uses a separately authorized response.
- Feedback contains stable message keys and safe Spanish copy, never provider
  errors or sensitive values.
- Normal CRUD never hard-deletes employee history.

## Loading, errors, and empty states

Use the implemented asynchronous UI foundation:

- Route skeleton for the directory and detail pages.
- Table skeleton that approximates real columns without fake employee data.
- Local Suspense for independently loaded history.
- Pending submit buttons for every mutation.
- Inline field validation.
- Safe feature-level error boundary.
- Toasts only for meaningful mutation outcomes.

## Initial implementation exclusions

- Quick-preview drawer.
- Batch editing or batch deactivation.
- Spreadsheet-style inline editing.
- Export and column customization.
- General identification or phone search.
- Persistent creation drafts.
- Historical correction UI.
- PTO balance and request management.
- Employee self-service profile UI.

## Reference patterns

- [Carbon data table usage](https://carbondesignsystem.com/components/data-table/usage/)
- [Carbon create flows](https://carbondesignsystem.com/community/patterns/create-flows/)
- [GOV.UK check answers](https://design-system.service.gov.uk/patterns/check-answers/)
- [GOV.UK task list](https://design-system.service.gov.uk/components/task-list/)
- [WAI modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
