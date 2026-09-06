# Production tasks — product requirements

**Status:** Implemented; production rollout pending

**Date:** 2026-09-03

**Product label:** Tareas de producción

**Primary route:** `/tareas`

## 1. Executive summary

Colaboradores DNA should add a shared **Tareas de producción** module for
planning, publishing, viewing, and completing the production plant's weekly
work.

Every authenticated application user can see the complete published board.
Collaborators also receive a focused view of their assignments for the current
day and can mark their assigned tasks as completed. Supervisors and
administrators can prepare weekly boards manually or import them from an XLSX
workbook, review validation results, and publish the plan.

The spreadsheet remains a supported input format, not the system of record.
The application stores structured tasks linked to stable employee records,
preserves published history, and exposes stable service and view-model
interfaces so that the UI can evolve without changing domain or persistence
rules.

## 2. Product decision

Build a dedicated `production-tasks` feature slice rather than adding task
fields to employees, schedules, calendar events, or absence records.

The first production release should include:

1. a public-to-authenticated-users weekly production board;
2. a homepage summary of the current collaborator's tasks for today;
3. a read-only full-board experience for collaborators;
4. task completion by assigned collaborators;
5. a weekly draft editor for supervisors and administrators;
6. XLSX upload, mapping, validation, and draft import;
7. an explicit draft and publish lifecycle;
8. immutable completion and board-change audit events;
9. automatically generated employee codes for reliable spreadsheet matching.

The application interface is in Spanish and must work on mobile and desktop,
in light and dark themes.

## 3. Problem and opportunity

Production work is currently organized in a weekly spreadsheet. Each tab
represents a week and uses the columns `Día`, `Área de trabajo`, `Producto`,
`Encargada`, and `Tarea`. The workbook is understandable to the people who
maintain it, but it creates several operational limitations:

- collaborators do not have a focused view of what they must do today;
- the team lacks a single application view of the current published plan;
- assignments depend on free-text names, including abbreviations and spelling
  variations;
- blank template rows and unused days create visual noise;
- changes and completion cannot be tracked reliably;
- workbook imports can contain incomplete, duplicate, or ambiguous rows;
- spreadsheet layout and merged cells are acting as data relationships;
- task information cannot be safely consumed by other application features.

The product should retain the familiar weekly planning model while making
assignments reliable, the board easy to scan, and changes auditable.

## 4. Goals

### Production planning

- Allow a supervisor or administrator to create and edit a weekly board.
- Support manual planning and XLSX import without creating two different data
  models.
- Make repeated weekly planning faster than maintaining the spreadsheet alone.
- Prevent incomplete or ambiguous data from reaching collaborators.

### Team visibility

- Let every authenticated user see the complete published production board.
- Make each collaborator's work for today immediately visible on the homepage.
- Preserve team context so collaborators can see what the rest of the plant is
  doing.
- Remove blank days, areas, and task rows from published views.

### Execution

- Let an assigned collaborator mark a task as completed.
- Reflect completion consistently for every person viewing the board.
- Record who completed or reopened a task and when.

### Architecture

- Keep domain, import, persistence, and authorization logic independent from
  presentation components.
- Link tasks through immutable employee IDs rather than names, emails, or
  national identification numbers.
- Provide narrow service interfaces for the homepage and future application
  integrations.

## 5. Product principles

### One shared source of truth

The published application board is authoritative. XLSX is an import and export
format; it is not a second live source of truth.

### Personal focus without hiding the team

The homepage and `Mis tareas` view prioritize the current collaborator's work.
The full published board remains visible to every authenticated user.

### Publish intentionally

Edits and imports begin as drafts. Collaborators see only published revisions.
Importing a workbook must never publish work automatically.

### Human-readable, stable identity

People should search and select collaborators by name in the application.
Spreadsheet assignment uses a short, generated employee code. Tasks persist
the employee's internal immutable ID.

### History over silent replacement

Published revisions, completion events, and material assignment changes are
preserved. Corrections do not erase who saw or completed earlier work.

### Operational signals, not performance scoring

Task counts and completion timestamps support coordination. They must not be
presented as individual productivity, performance, or ranking metrics because
tasks differ in effort and may have multiple assignees.

## 6. Users and authorization

| User             | Published board       | Complete tasks      | Create/edit/import | Publish | Reopen tasks                              |
| ---------------- | --------------------- | ------------------- | ------------------ | ------- | ----------------------------------------- |
| Collaborator     | Entire board          | Assigned tasks only | No                 | No      | Own completion, subject to the rule below |
| Supervisor       | Entire board          | Any task            | Entire board       | Yes     | Any task                                  |
| Administrator    | Entire board          | Any task            | Entire board       | Yes     | Any task                                  |
| Deactivated user | No application access | No                  | No                 | No      | No                                        |

For the MVP, every active supervisor and administrator may manage the complete
production board. Department- or reporting-line-based management restrictions
are deferred.

"Public board" means visible to every authenticated, active application user.
It does not mean publicly accessible on the internet.

Every server read and mutation must authorize independently. The actor and
employee identity are derived from `requirePlatformUser`; clients never submit
an authoritative actor ID or role.

## 7. Scope

### P0 — production MVP

- Navigation entry and consistent section header for `Tareas de producción`.
- Current-day and weekly published board views.
- Homepage `Mis tareas de hoy` summary.
- Full-team visibility for all active application users.
- Filters for day, area, assignee, and completion state.
- Empty rows, days, and area groups omitted from read views.
- Manual weekly draft creation and editing.
- Multiple assignees per task.
- Draft preview and explicit publication.
- XLSX upload, preview, mapping, validation, and draft commit.
- Assisted matching for legacy workbooks that contain names.
- Generated `DNA-####` employee codes and a downloadable collaborator catalog.
- Pending and completed task states.
- Completion by assigned collaborators.
- Reopening by supervisors and administrators.
- Same-day undo by the collaborator who completed a task.
- Optimistic concurrency for board edits and completion.
- Board revision history and content-free audit metadata.
- Loading, empty, error, permission-denied, import-error, and stale-write states.
- Responsive, keyboard, screen-reader, light-theme, and dark-theme coverage.

### P1 — next release

- Copy the previous week into a new draft.
- Reusable task and area templates.
- Warnings when an assignee is not scheduled or has approved leave.
- Comparison between published revisions.
- Notification or homepage indication when a published assignment changes.
- Remembered, administrator-reviewed legacy name aliases.
- Optional quantities, units, batch references, priorities, and time windows.
- Controlled XLSX export using the official template.

### P2 — later

- Department- or plant-area-scoped supervisor permissions.
- Task dependencies and production-stage relationships.
- Optional `in_progress` or acknowledgement states.
- Comments or exception notes with an explicit retention policy.
- Kiosk or print-optimized plant-floor view.
- Operational workload planning based on estimated effort, never raw task
  counts alone.
- External notifications or production-system integrations.

### Explicit non-goals

- Using the uploaded workbook as the live database.
- Public, unauthenticated access to production tasks.
- Assigning tasks by national identification number.
- Persisting a person's name or email as the task relationship.
- Automatic employee performance scores, rankings, or productivity reports.
- Executing spreadsheet formulas, macros, or external workbook links.
- Real-time collaborative cell editing in the MVP.
- Arbitrary file attachments or rich text in task descriptions.

## 8. Information architecture

| Route                            | Access                    | Purpose                                |
| -------------------------------- | ------------------------- | -------------------------------------- |
| `/tareas`                        | All active users          | Published board, defaulting to today.  |
| `/tareas?periodo=semana`         | All active users          | Complete published weekly board.       |
| `/tareas?vista=mias`             | All active users          | Focused current-user assignments.      |
| `/tareas/planificacion`          | Supervisor, administrator | Week directory and planning dashboard. |
| `/tareas/planificacion/[weekId]` | Supervisor, administrator | Weekly draft editor and publication.   |
| `/tareas/importar`               | Supervisor, administrator | XLSX import wizard.                    |

The focused and full-board experiences use query state under `/tareas` rather
than requiring a separate `/tareas/mis-tareas` route in the MVP. This keeps
navigation simple while preserving direct links to a chosen view.

Supervisors require a normal application navigation entry to planning. The
feature must not be reachable only through an `/admin` route because supervisor
and administrator are distinct platform roles.

## 9. Core experiences

### 9.1 Homepage — `Mis tareas de hoy`

Every active user sees a compact task summary derived from the current date in
`America/Costa_Rica` and their authenticated employee record.

The module shows:

- pending task count;
- completed task count;
- a short list of today's assigned tasks;
- task description as the primary text;
- product or element and area as secondary context;
- a completion control when the task is still pending;
- `Ver todas las tareas` linking to `/tareas?vista=mias`.

The empty state reads `No tenés tareas asignadas para hoy` and still provides a
link to the complete board.

The homepage must not fetch or expose draft boards. A task marked complete from
the homepage updates the same task shown on the full board.

### 9.2 Published board

The default view opens on today. A `Hoy` / `Semana` control lets users move
between the daily and weekly representations. Previous and next week controls
must clearly display the selected date range.

Within a day, the content order is:

1. `Mis tareas`, when the current user has assignments;
2. `Equipo completo`, containing the complete plan with the current user's
   tasks visually identifiable but not duplicated;
3. tasks grouped by area using a stable operational order.

Each task displays:

- completion control or completion indicator;
- task description;
- product or element when present;
- area;
- all assignees;
- completion actor and time when completed.

Published views never render empty spreadsheet slots. A day or area with no
valid tasks is omitted. Long products and task descriptions wrap without being
truncated into unusable table columns.

On desktop, the board may use a grouped list or lightweight table. On mobile,
it uses stacked groups and task rows with controls large enough for touch.

### 9.3 Planning dashboard

`/tareas/planificacion` provides supervisors and administrators with:

- the current and upcoming weeks;
- draft, published, and superseded status;
- task, assignee, incomplete-row, and import-warning counts;
- `Crear semana`, `Copiar semana` when available, and `Importar XLSX` actions;
- search or date navigation for historical weeks;
- a direct link to edit or inspect each revision.

The selected week is identified by exact start and end dates, not only by a
display label.

### 9.4 Weekly editor

The editor groups work by exact date and then by area. It preserves the mental
model of the spreadsheet without reproducing merged cells or fixed empty rows.

Each task row supports:

- exact work date;
- area selection;
- `Producto o elemento`, optional;
- task description, required;
- one or more assignees, required;
- drag or button-based ordering;
- duplicate and remove actions.

Assignee selection uses a searchable combobox. Users can search by preferred
name, legal name, email, or employee code. Results show the name first and
`DNA-####` as secondary disambiguation. The editor stores internal employee IDs.

The editor provides explicit `Guardar borrador`, `Vista previa`, and `Publicar`
actions. Publishing is blocked by validation errors and permitted with
acknowledged non-blocking warnings.

### 9.5 Task completion

Completion belongs to the shared task rather than separately to every
assignee. When several people are assigned to one task, any assigned
collaborator can complete it for the group.

Completing a task stores:

- the completed state;
- the authenticated employee who performed the action;
- a UTC timestamp;
- the task version on which the action was based.

The published board displays `Completada por {nombre} · {hora}`. Supervisors and
administrators can reopen any task. The collaborator who completed a task can
undo it until the end of that Costa Rica business date. Every completion and
reopening creates an immutable activity event.

Changing task text, date, area, or assignees does not silently remove completion
history. Removing a completed task archives it within the historical revision
rather than hard-deleting its activity.

## 10. Employee identifier

### Identifier format

Every employee receives a human-readable operational code:

```text
DNA-0001
DNA-0002
DNA-0003
```

The code is:

- generated automatically when the employee is created;
- assigned from an atomic numeric sequence;
- unique under a database index;
- uppercase and compared canonically;
- immutable after creation;
- never reused after deactivation or termination;
- free of names, initials, department, role, hiring year, email, or national ID.

The code is safe to display in authenticated operational workflows but is not
the database relationship.

```ts
type EmployeeIdentityReference = {
  employeeId: string; // Internal canonical relationship
  employeeCode: string; // Human/import identifier, e.g. DNA-0042
  displayName: string; // Presentation and search
};
```

### Existing employees

Before enabling new-format imports, the application must:

1. generate a code for every existing employee using a deterministic reviewed
   migration order;
2. prevent duplicates through the same atomic sequence and unique index;
3. provide an administrator review/export of code-to-name mappings;
4. preserve generated codes permanently.

### Display locations

Employee codes appear in:

- collaborator administration lists and details;
- assignee search results;
- the official XLSX collaborator catalog;
- import mapping and validation results.

Names remain primary in everyday task cards and board views.

## 11. XLSX import

### Supported workbook structure

The legacy importer recognizes weekly sheets with the concepts:

- day;
- work area;
- product or element;
- assignee text;
- task description.

It supports merged day and area cells by forward-filling those values during
preview. Formatting colors are presentation hints only and never authoritative
data.

The official template should contain:

- one or more weekly task sheets;
- a generated, protected `Colaboradores` reference sheet;
- `Código`, `Nombre`, and active state in the reference catalog;
- separate `Encargado 1`, `Encargado 2`, and subsequent optional assignee
  columns with employee-code validation where practical.

The domain model does not impose the spreadsheet's number of assignee columns.
The importer combines every populated assignee column into one assignee set.

For backward compatibility, one legacy assignee cell may contain comma- or
Spanish `y`-separated names or codes.

### Import workflow

1. Upload an `.xlsx` file.
2. Select the weekly sheets to import; known template sheets such as `Original`
   are excluded by default.
3. Confirm the exact target dates for each sheet.
4. Parse values without executing formulas, macros, or external links.
5. Forward-fill merged day and area labels.
6. Map area text to canonical area IDs.
7. Resolve employee codes exactly.
8. Present legacy names and fuzzy candidates for explicit human confirmation.
9. Validate task completeness and show duplicates or conflicts.
10. Preview additions, changes, skipped rows, and errors.
11. Commit the approved result to a draft.
12. Publish separately from the weekly editor.

The importer must not infer exact task dates solely from a sheet name. The user
confirms the week and day mapping before commit.

### Row validation

| Imported row          | Result                                             |
| --------------------- | -------------------------------------------------- |
| Completely blank      | Ignore.                                            |
| Product only          | Skip as an empty/template candidate and report it. |
| Task without assignee | Blocking error until assigned.                     |
| Assignee without task | Blocking error.                                    |
| Unknown employee code | Blocking mapping error.                            |
| Ambiguous legacy name | Requires explicit user selection.                  |
| Unknown area          | Requires mapping or canonical area creation.       |
| Possible duplicate    | Show conflict; never overwrite silently.           |
| Complete valid row    | Include in draft preview.                          |

Suggested duplicate comparison uses target date, canonical area, normalized
product, normalized description, and unordered assignee set. A match is still
shown to the user before changing an existing draft or published task.

### Import audit and safety

Each committed import records:

- workbook hash;
- original sheet and row for every imported task;
- importing actor;
- import timestamp;
- confirmed employee and area mappings;
- counts of added, changed, skipped, duplicate, and rejected rows.

Uploads are untrusted. The server enforces file-size, sheet-count, row-count,
cell-count, decompressed-size, and text-length limits; rejects macro-enabled
workbooks and external links; protects against archive expansion attacks; and
never evaluates formulas. Raw workbooks are transient unless a separate
retention decision explicitly requires storage.

## 12. Canonical domain model

### Weekly plan

```ts
type ProductionWeekPlan = {
  id: string;
  timezone: "America/Costa_Rica";
  weekStart: string;
  weekEnd: string;
  status: "draft" | "published" | "superseded";
  revision: number;
  version: number;
  tasks: ProductionTask[];
  createdAt: Date;
  createdByEmployeeId: string;
  updatedAt: Date;
  updatedByEmployeeId: string;
  publishedAt: Date | null;
  publishedByEmployeeId: string | null;
};
```

Business dates use `YYYY-MM-DD`. Audit timestamps use UTC `Date` values.

### Task

```ts
type ProductionTask = {
  id: string;
  workDate: string;
  areaId: string;
  areaLabelSnapshot: string;
  subject: string | null;
  description: string;
  assigneeEmployeeIds: string[];
  status: "pending" | "completed";
  completedAt: Date | null;
  completedByEmployeeId: string | null;
  sortOrder: number;
  version: number;
  source: TaskImportSource | null;
};
```

Every published task requires an exact date, canonical area, meaningful task
description, and at least one active employee assignment. `subject` is optional
because cleaning, inventory, routes, and other work may not correspond to a
product.

### Activity

```ts
type ProductionTaskActivity = {
  id: string;
  taskId: string;
  planId: string;
  action: "completed" | "reopened";
  performedByEmployeeId: string;
  performedAt: Date;
  taskVersion: number;
};
```

Activity is append-only. It should remain separate from mutable task state so a
reopened task does not erase its earlier completion.

### Storage decision

For the observed weekly volume, one versioned weekly plan containing embedded
task definitions is an appropriate MVP aggregate and permits atomic
publication. Completion activity should use a separate collection to preserve
an append-only history and avoid growing the plan document indefinitely.

If concurrent execution updates later create excessive contention, mutable
task execution state may move to a task collection without changing the public
service or view-model contracts.

## 13. Lifecycle and revision rules

```text
Weekly plan: draft -> published -> superseded
Task:        pending <-> completed
```

- There is at most one current published revision for a week.
- Draft changes are invisible to collaborators outside planning.
- Publishing validates the complete board and supersedes the previous revision
  atomically.
- Editing a published board produces a new draft revision rather than mutating
  the published snapshot in place.
- Matching tasks retain stable task IDs where possible so completion history
  can be reconciled across a correction.
- Assignment, date, or meaningfully changed description conflicts require a
  review before existing completion state is preserved.
- Weekly plans and completed tasks are archived or superseded, never hard
  deleted through normal product workflows.
- Every command uses optimistic concurrency and returns a clear stale-write
  response when its expected version no longer matches.

## 14. Feature architecture

```text
features/production-tasks/
├── components/    Board, homepage summary, editor, and import presentation
├── domain/        Plan, task, import, completion, and publication rules
├── integrations/ Feature-owned ports and provider adapters
├── server/        Authorized services, queries, repositories, parser, indexes
└── view-models/   Serializable board, editor, and import-preview projections
```

The feature owns production plan persistence and completion activity. It does
not own employee identity, work schedules, or approved leave.

First-party Server Components and Server Actions call server-only services
directly. An internal HTTP endpoint should not be added merely for first-party
application code to call. A dedicated upload handler is acceptable only when
deployment runtime or request-size constraints require it.

### Integration ports

The feature owns narrow ports for:

- Employees: active employees, display identity, employee-code lookup, and
  platform role;
- Scheduling: whether an employee is scheduled on a task date;
- PTO: whether an employee has approved leave on a task date.

Schedule and PTO conflicts are warnings in planning, not automatic assignment
blocks. The supervisor or administrator can acknowledge a legitimate exception
before publication.

### Service API

The server boundary should expose use cases equivalent to:

- `getPublishedTaskBoardForCurrentUser`;
- `getTodayTaskSummaryForCurrentUser`;
- `completeAssignedTask`;
- `undoOwnTaskCompletion`;
- `reopenTaskAsManager`;
- `listProductionWeeksForPlanning`;
- `getWeekPlanForEditor`;
- `createWeekPlan`;
- `saveWeekPlanDraft`;
- `publishWeekPlan`;
- `previewWorkbookImport`;
- `commitWorkbookImport`;
- `copyPreviousWeek` when P1 is implemented.

Components consume stable view models rather than repositories or MongoDB
documents. This allows the board, editor, and mobile presentation to change
without rewriting import or persistence logic.

## 15. Validation and business rules

- A weekly plan uses exact Costa Rica business dates.
- Every published task belongs to its plan's covered date range.
- Every published task has a canonical area and non-empty description.
- Every published task has at least one active assignee.
- Multiple assignees are stored as a set without duplicates.
- Employee codes are used for lookup only; persisted assignments use employee
  IDs.
- A collaborator may complete a task only while assigned to it.
- Completion is shared across all assignees of the task.
- A collaborator may undo only their own completion and only on the same Costa
  Rica business date.
- A supervisor or administrator may reopen any task.
- Draft imports cannot affect the published board until publication succeeds.
- Empty rows never become task records.
- Task counts are never labeled as productivity or performance.

## 16. Accessibility and interaction requirements

- Completion controls have an explicit accessible name containing the task.
- Status is communicated through text and iconography, never color alone.
- Every board, filter, dialog, combobox, and import step is keyboard operable.
- Focus remains visible in both themes.
- Touch targets meet the application's minimum control size.
- Completion uses a reversible confirmation or clear undo path rather than a
  disruptive confirmation dialog for every task.
- Screen readers receive completion changes through an appropriate live region.
- Long names and descriptions wrap without obscuring controls.
- Reduced-motion preferences are respected.
- Loading skeletons preserve the final section-header and task-group layout.

## 17. Acceptance criteria

### Visibility

- Given an active collaborator and a published week, when they open `/tareas`,
  then they can see every valid task on the selected published board.
- Given a draft and a published revision for the same week, when a collaborator
  opens the board, then only the published revision is returned.
- Given days, areas, or spreadsheet slots without valid tasks, when the board is
  rendered, then those empty structures are absent.

### Homepage

- Given a collaborator with tasks today, when the homepage loads, then their
  pending and completed counts and assigned tasks are shown.
- Given a collaborator without tasks today, when the homepage loads, then the
  empty state and link to the complete board are shown.

### Completion

- Given a pending task assigned to two collaborators, when either assignee
  completes it, then it is completed for both and the actor and timestamp are
  visible.
- Given an unassigned collaborator, when they attempt the same mutation
  directly, then the server denies it even though they can view the task.
- Given the completing collaborator on the same business date, when they undo
  completion, then the task returns to pending and both events remain in
  history.
- Given two users updating the same task version, when the second stale command
  arrives, then it does not overwrite the newer state and receives a clear
  refresh response.

### Planning and publication

- Given a supervisor or administrator, when they create or edit a draft, then
  no collaborator sees the changes before publication.
- Given a draft with incomplete tasks, when publication is requested, then it
  is blocked with actionable validation messages.
- Given a valid draft, when it is published, then it becomes the single current
  published revision for that week.

### Import

- Given the supported legacy workbook, when it is previewed, then merged day
  and area values are applied to their task rows and blank template rows are
  excluded.
- Given an unknown code or ambiguous legacy name, when import is previewed,
  then the row requires explicit mapping before commit.
- Given a successful import commit, then only a draft is changed; publication
  remains a separate authorized action.
- Given a workbook containing formulas, macros, external links, or excessive
  content, then the importer does not execute active content and rejects unsafe
  input according to its limits.

### Identity

- Given a newly created employee, then exactly one unique immutable
  `DNA-####` code is generated.
- Given an employee name, email, department, or role change, then their employee
  code and internal employee ID remain unchanged.
- Given a task assignment, then the stored relationship contains employee IDs,
  not display names, emails, codes, or national IDs.

## 18. Success measures

Initial success should be evaluated through operational outcomes rather than
individual performance:

- percentage of active production weeks published in the application;
- percentage of spreadsheet rows imported without manual correction;
- count and type of import validation issues;
- percentage of collaborators who view their assigned work during the week;
- median time required to prepare and publish a weekly board;
- reduction in unknown or ambiguous assignee names;
- number of published corrections after the week begins.

Completion rate may describe the board's operational state, but it must not be
used as an employee score without a separate, explicitly reviewed product and
policy decision.

## 19. Delivery sequence

### Phase 1 — foundation

- employee-code generation and migration;
- production-task domain, repositories, indexes, and authorization;
- weekly draft/publish lifecycle;
- task completion and activity history;
- server queries and view-model contracts.

### Phase 2 — planning and import

- planning dashboard and weekly editor;
- official workbook template and collaborator catalog;
- import parser, preview, validation, mapping, and draft commit;
- publication preview and revision handling.

### Phase 3 — visibility and execution

- published daily and weekly board;
- homepage `Mis tareas de hoy` integration;
- collaborator completion and same-day undo;
- responsive, accessible, loading, empty, and error states.

### Phase 4 — operational improvements

- copy previous week and reusable templates;
- schedule and approved-leave warnings;
- revision comparison and assignment-change notifications;
- controlled export and optional production metadata.

## 20. Confirmed decisions and assumptions

Confirmed product decisions:

- The complete published board is visible to every authenticated app user.
- The homepage shows whether the current collaborator has tasks assigned today.
- Collaborators can also inspect the board as a whole.
- Supervisors and administrators can upload and edit the complete board in the
  MVP; there is no department restriction initially.
- Collaborators can mark assigned tasks as completed.
- XLSX remains a supported import workflow.
- Empty spreadsheet rows are not displayed or stored as tasks.
- Employee assignment uses a generated operational code for import and an
  internal employee ID for persistence.

The following interaction rule is an explicit MVP assumption and should be
validated during design review: a multi-assignee spreadsheet row represents one
shared task, so completion by any assignee completes it for the group. If the
business instead needs individual confirmation from every assignee, the
completion model must change before implementation begins.
