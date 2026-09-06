# Production tasks — implementation roadmap

**Status:** Implemented in code; Phase 6 organizational release gates pending

**Date:** 2026-09-03

**Source PRD:** [Production tasks](./production-tasks-prd.md)

**Product label:** Tareas de producción

## 1. Delivery recommendation

Build the module as a sequence of vertical stories. Each phase should leave a
testable product capability behind it; avoid building a complete UI over mock
data or a complete repository with no authorized user workflow.

Recommended sequence:

```text
Validate workflow and completion model
                ↓
Employee identity and feature foundation
                ↓
Draft planning and publication
                ↓
XLSX preview, mapping, and import
                ↓
Published team board and homepage summary
                ↓
Task completion experience
                ↓
Operational improvements and rollout
```

The spreadsheet is an import format. The published application board is the
source of truth once the feature is enabled.

## 2. Confirmed delivery assumptions

- Every authenticated, active application user can view the complete published
  production board.
- Collaborators see their own current-day assignments on Inicio and can open
  the complete board.
- Collaborators can complete only tasks assigned to them.
- Supervisors and administrators can manage the complete board in the MVP.
- Drafts and imports are invisible to collaborators until explicitly
  published.
- Tasks persist internal employee IDs. Human workflows and spreadsheets use
  generated, immutable `DNA-####` employee codes.
- Empty spreadsheet rows and unused day or area groups are not stored or
  rendered.
- Business dates use `America/Costa_Rica`; audit timestamps use UTC.

The multi-assignee completion rule remains a Phase 0 product gate: the PRD
assumes that any assignee completing a shared task completes it for the group.

## 3. Roadmap overview

| ID    | User story                                        | Phase | Priority | Depends on          |
| ----- | ------------------------------------------------- | ----- | -------- | ------------------- |
| PT-01 | Validate the board and shared-completion workflow | 0     | P0       | —                   |
| PT-02 | Generate stable employee codes                    | 1     | P0       | PT-01               |
| PT-03 | Establish the production-task feature boundary    | 1     | P0       | PT-01               |
| PT-04 | Create and preserve weekly plan revisions         | 1     | P0       | PT-03               |
| PT-05 | Enforce board authorization and visibility        | 1     | P0       | PT-03, PT-04        |
| PT-06 | Complete and reopen assigned tasks                | 1     | P0       | PT-04, PT-05        |
| PT-07 | Browse weeks in the planning dashboard            | 2     | P0       | PT-04, PT-05        |
| PT-08 | Create and edit a weekly draft                    | 2     | P0       | PT-02, PT-04, PT-05 |
| PT-09 | Preview and publish a weekly plan                 | 2     | P0       | PT-08               |
| PT-10 | Download an official import template and catalog  | 3     | P0       | PT-02               |
| PT-11 | Upload and safely parse an XLSX workbook          | 3     | P0       | PT-03, PT-10        |
| PT-12 | Resolve and validate imported rows                | 3     | P0       | PT-02, PT-11        |
| PT-13 | Commit an approved import to a draft              | 3     | P0       | PT-08, PT-12        |
| PT-14 | View the published daily and weekly board         | 4     | P0       | PT-05, PT-09        |
| PT-15 | See today's personal tasks on Inicio              | 4     | P0       | PT-14               |
| PT-16 | Complete tasks from the user interface            | 4     | P0       | PT-06, PT-14, PT-15 |
| PT-17 | Copy a previous week and reuse task patterns      | 5     | P1       | PT-08, PT-09        |
| PT-18 | Warn about schedules and approved leave           | 5     | P1       | PT-08               |
| PT-19 | Review revisions and assignment changes           | 5     | P1       | PT-09, PT-14        |
| PT-20 | Harden, migrate, pilot, and release the module    | 6     | P0       | PT-01–PT-16         |

## 4. Shared definition-of-done rules

The story-specific definition of done supplements these rules; it does not
replace them.

Every implementation story is done only when:

- domain and authorization rules are enforced on the server, not only through
  hidden controls;
- repositories and MongoDB document types remain server-only;
- Server Components and Server Actions use authorized feature services rather
  than an internal HTTP endpoint;
- client-facing data uses explicit serializable view models;
- mutations use validation, safe errors, and optimistic concurrency where
  mutable state is involved;
- material mutations and their content-free audit events share a transaction;
- user-facing copy is in Spanish;
- loading, empty, error, permission, and stale-write states relevant to the
  story are implemented;
- keyboard access, visible focus, screen-reader names, touch targets, contrast,
  reduced motion, mobile, desktop, light theme, and dark theme are verified;
- unit, integration, and authorization tests appropriate to the risk pass;
- the feature documentation is updated when a public contract or product rule
  changes;
- lint, type checks, targeted tests, and the relevant production build pass.

## 5. Phase 0 — validate the workflow

### PT-01 — Validate the board and shared-completion workflow

**User story**

As a production collaborator or board manager, I want the proposed daily,
weekly, planning, import, and completion flows validated with realistic work so
that the implementation matches how the plant actually coordinates tasks.

**Acceptance criteria**

1. Low-fidelity mobile and desktop prototypes cover Inicio, `/tareas`, the
   planning dashboard, the weekly editor, and the import review.
2. Testing includes a week with unused days, several areas, long descriptions,
   incomplete imported rows, and tasks with multiple assignees.
3. At least one collaborator can find today's work and then inspect the full
   board without instruction.
4. At least one supervisor or administrator can add a task, assign multiple
   people, identify an import error, and publish a draft without instruction.
5. Product confirms whether one assignee completes a multi-assignee task for
   the group or each assignee requires an individual completion.
6. Product confirms the same-day collaborator undo rule or records an amended
   rule in the PRD.
7. The Spanish labels `Tareas de producción`, `Mis tareas`, `Equipo completo`,
   `Borrador`, `Publicada`, and `Completada` are reviewed with users.

**Definition of done**

- Prototype findings and decisions are recorded in the PRD.
- The multi-assignee completion model has one unambiguous approved rule.
- Blocking usability issues have a documented resolution.
- The prototype is reviewed at mobile and desktop widths and with both themes.
- Phase 1 stories contain no unresolved product dependency from this workflow.

## 6. Phase 1 — identity and domain foundation

### PT-02 — Generate stable employee codes

**User story**

As an administrator or supervisor, I want every collaborator to have a short,
stable code so that spreadsheet assignments can be entered and matched without
depending on names or sensitive identifiers.

**Acceptance criteria**

1. New employees receive one automatically generated code in the format
   `DNA-####` as part of employee creation.
2. Code generation uses an atomic sequence and cannot issue the same code to
   concurrent employee creations.
3. The code is immutable and is not reused after employee deactivation or
   termination.
4. Names, emails, roles, departments, hiring dates, and national IDs do not
   contribute to the code.
5. Existing employees receive unique codes through a repeatable reviewed
   migration.
6. Administrator collaborator lists and details show the code as secondary
   identity information.
7. Authorized employee lookup can resolve an exact normalized code to one
   internal employee ID.
8. Task-facing code lookup never returns national ID or unrelated employee
   profile fields.

**Definition of done**

- Employee schema, service, mapping, validation, and unique index are updated.
- Employee creation and existing transactional workflows generate codes
  atomically.
- A repeatable migration/bootstrap procedure assigns and verifies existing
  codes without changing them on rerun.
- Concurrency, uniqueness, immutability, authorization, and redacted-projection
  tests pass.
- Employee model documentation describes the operational code and migration.
- A rollback and recovery procedure exists for a failed non-production
  migration before production execution is authorized.

### PT-03 — Establish the production-task feature boundary

**User story**

As an application maintainer, I want production tasks isolated behind a stable
feature boundary so that the board UI, spreadsheet importer, and persistence
can evolve independently.

**Acceptance criteria**

1. `web/src/features/production-tasks/` contains explicit `domain`,
   `integrations`, `server`, `view-models`, and `components` boundaries, with
   thin actions added when mutations become available.
2. Domain types represent exact task dates, areas, optional products, task
   descriptions, multiple employee IDs, order, and status without spreadsheet
   layout concepts.
3. Employee, Scheduling, and PTO data are reachable only through narrow
   production-task-owned ports.
4. Components cannot import repositories, MongoDB document types, or workbook
   parser internals.
5. First-party callers use a server service rather than an internal HTTP API.
6. Dates, time zones, normalization, and typed domain errors have one tested
   implementation boundary.

**Definition of done**

- The slice structure and server-only import guards are in place.
- Domain schemas and pure mapping utilities have unit tests.
- Dependency tests or import conventions prevent boundary violations.
- The feature architecture is documented with owned and integrated data.
- No user-facing route is enabled solely by this enabling story.

### PT-04 — Create and preserve weekly plan revisions

**User story**

As a board manager, I want weekly plans to have draft and published revisions
so that I can prepare changes safely without silently replacing instructions
already visible to collaborators.

**Acceptance criteria**

1. A plan stores exact `weekStart` and `weekEnd` business dates in Costa Rica,
   a revision, version, status, tasks, and audit metadata.
2. Valid states are `draft`, `published`, and `superseded`.
3. At most one revision is current and published for a week.
4. Publishing a valid draft and superseding the previous published revision
   occur atomically.
5. Editing a published week creates or targets a new draft revision rather than
   mutating the published snapshot in place.
6. Normal workflows never hard-delete a published plan.
7. Updates compare the expected version and return a typed conflict for stale
   writes.
8. List and read projections do not expose repository documents.

**Definition of done**

- Domain lifecycle, repository, indexes, document mappings, and migration-only
  bootstrap are implemented.
- Unique-current-publication and optimistic-concurrency tests pass.
- Publish, supersede, rollback-on-audit-failure, and history tests pass.
- Audit entries contain IDs, action, actor, changed field names, and timestamp,
  but not task descriptions or spreadsheet contents.
- Index creation does not require production runtime credentials.

### PT-05 — Enforce board authorization and visibility

**User story**

As an authenticated app user, I want board access to follow my active account
and role so that everyone can see published work while only authorized people
can manage it.

**Acceptance criteria**

1. Any active collaborator, supervisor, or administrator can read the complete
   current published board.
2. Collaborators cannot read drafts, superseded planning data, import previews,
   or planning metadata.
3. Supervisors and administrators can create, edit, import, preview, and
   publish across the entire board in the MVP.
4. Signed-out, deactivated, unlinked, and non-MFA privileged users fail closed
   according to the existing authentication boundary.
5. Navigation visibility is consistent with permissions but is not relied on
   for authorization.
6. Target actor IDs and roles supplied by clients are ignored or rejected.
7. Unauthorized errors do not reveal whether a draft, task, import, or employee
   exists.

**Definition of done**

- A documented permission matrix is implemented in authorized services.
- Route, query, action, and forged-direct-call authorization tests cover every
  platform role and inactive state.
- Supervisor navigation reaches planning without depending on an administrator
  route hierarchy.
- Published board responses are private to authenticated sessions and are not
  stored by the service worker or a public cache.

### PT-06 — Complete and reopen assigned tasks

**User story**

As an assigned collaborator, I want to mark a task complete and correct an
accidental same-day completion so that the shared board reflects actual work.

**Acceptance criteria**

1. An assigned collaborator can complete a pending task on a published board.
2. A collaborator who is not assigned can view the task but cannot complete it,
   including through a direct server call.
3. Completion records the authenticated employee, UTC timestamp, and expected
   task version.
4. The approved PT-01 multi-assignee rule is enforced consistently.
5. The collaborator who completed a task can undo it only during the same
   Costa Rica business date.
6. A supervisor or administrator can reopen any completed task.
7. Completion and reopening events are append-only and remain available after
   a task is reopened.
8. Two concurrent state changes cannot silently overwrite each other.
9. Completion history is reconciled explicitly rather than discarded when a
   corrected board revision preserves the same task identity.

**Definition of done**

- Completion domain rules, authorized commands, repository updates, activity
  storage, and content-free audit are implemented transactionally.
- Assignment, role, business-date boundary, multi-assignee, stale-version, and
  replay tests pass.
- Task descriptions and collaborator names are absent from audit payloads and
  safe server logs.
- Service contracts are ready for both Inicio and `/tareas` without duplicating
  completion logic.

## 7. Phase 2 — manual planning and publication

### PT-07 — Browse weeks in the planning dashboard

**User story**

As a supervisor or administrator, I want to find current, upcoming, and past
weekly plans so that I can quickly continue a draft or inspect what was
published.

**Acceptance criteria**

1. `/tareas/planificacion` is available to active supervisors and
   administrators.
2. The page uses the shared section-header design and exposes `Crear semana`
   and `Importar XLSX` actions.
3. Each week displays its exact date range, current status, revision, task
   count, assignee coverage, and blocking-error count when relevant.
4. Current and upcoming weeks are easy to reach, and historical weeks can be
   found through date navigation.
5. Draft and published revisions are visually and programmatically distinct
   without relying on color alone.
6. Empty, loading, failure, and permission states provide appropriate Spanish
   guidance.
7. Selecting a week opens its canonical editor or read-only revision route.

**Definition of done**

- The authorized list query uses a bounded projection and appropriate indexes.
- Responsive planning cards or rows match the application design system.
- Route metadata, skeleton, error boundary, and empty state are implemented.
- Keyboard, screen-reader, mobile, desktop, and both-theme checks pass.
- Query, authorization, and view-model tests pass.

### PT-08 — Create and edit a weekly draft

**User story**

As a supervisor or administrator, I want to build a weekly plan by date and
area and assign one or more collaborators so that production work can be
prepared without editing raw spreadsheet structure.

**Acceptance criteria**

1. An authorized user can create or open a draft for an exact week.
2. Tasks are grouped by date and area, with no fixed blank rows.
3. A task accepts an exact work date, canonical area, optional product or
   element, required description, one or more assignees, and sort order.
4. The editor supports add, duplicate, reorder, and remove actions.
5. Assignees are selected through a searchable multi-select supporting name,
   email, and exact `DNA-####` code searches.
6. Search results present the collaborator name first and employee code as
   secondary identity information.
7. Only active employees can be newly assigned.
8. Saving validates on the server and preserves the user's work when a
   recoverable validation error occurs.
9. Two editors cannot silently overwrite each other's newer draft.
10. Editing a published plan operates on a draft revision.

**Definition of done**

- The editor uses domain commands and view models rather than storing form
  structure as the database model.
- Authorized create and save actions, validation, optimistic concurrency, and
  audit are implemented.
- Assignee search returns an allowlisted projection and handles duplicate names
  safely.
- Dynamic rows remain keyboard operable and retain useful focus after add,
  duplicate, reorder, and remove operations.
- Unit, integration, action, authorization, and UI interaction tests pass.
- Mobile and desktop editors work without losing long products or descriptions.

### PT-09 — Preview and publish a weekly plan

**User story**

As a supervisor or administrator, I want to review a collaborator-facing
preview and publish a validated week so that the team receives complete and
intentional instructions.

**Acceptance criteria**

1. Preview uses the same ordering and essential content as the published board.
2. Publication is blocked when a task lacks a valid date, area, description, or
   active assignee.
3. Warnings and blocking errors are presented separately.
4. Publishing requires an explicit confirmation that identifies the exact week
   and task count.
5. Successful publication atomically creates the current published revision
   and supersedes the previous one when present.
6. Collaborator reads see the new revision only after the transaction
   succeeds.
7. A stale editor cannot publish over a newer draft.
8. Failure leaves the previous published revision available and the draft
   recoverable.

**Definition of done**

- Preview and publish services share domain validation with the editor.
- Publication, supersession, stale-write, failed-transaction, and concurrent
  publication tests pass.
- The confirmation, success, failure, and stale-data interactions are
  accessible and responsive.
- Published task and audit data can be traced to the responsible actor without
  storing task content in audit records.

## 8. Phase 3 — workbook import

### PT-10 — Download an official import template and catalog

**User story**

As a supervisor or administrator, I want a current workbook template with
employee codes so that I can prepare assignments without memorizing identifiers
or introducing avoidable name errors.

**Acceptance criteria**

1. An authorized user can download an official XLSX template from the planning
   or import flow.
2. The workbook includes a protected `Colaboradores` sheet containing active
   employee code and display name only.
3. Task sheets provide date/day, canonical area, product or element, task, and
   separate optional assignee-code columns.
4. Assignee columns use workbook validation or clear reference guidance where
   spreadsheet limitations prevent reliable multi-selection.
5. The generated template contains no personal email, national ID, phone,
   birthday, schedule, leave, or access information.
6. Collaborator catalog rows use deterministic ordering and the current active
   employee set.
7. The template version is machine-readable by the importer.

**Definition of done**

- Template generation is authorized and uses a narrow employee projection.
- A generated workbook opens without repair warnings in supported spreadsheet
  software.
- Automated checks verify required sheets, headers, validation ranges, version,
  and absence of sensitive fields.
- The template is documented with a short Spanish usage guide.
- Visual inspection confirms readable widths, wrapping, frozen headers, and
  useful light-theme workbook formatting.

### PT-11 — Upload and safely parse an XLSX workbook

**User story**

As a supervisor or administrator, I want to upload a weekly workbook and select
its relevant sheets so that existing planning work can be brought into the
application safely.

**Acceptance criteria**

1. `/tareas/importar` accepts supported `.xlsx` files from authorized
   supervisors and administrators only.
2. The upload enforces configured compressed size, decompressed size, sheet,
   row, cell, and text-length limits.
3. Macro-enabled files, unsafe external links, malformed archives, and archive
   expansion attacks are rejected safely.
4. Formulas are never evaluated; only cached values are considered where
   policy permits, and formula presence is reported.
5. Users select one or more sheets; known template sheets such as `Original`
   are excluded by default.
6. Merged day and area cells are forward-filled only for import preview.
7. The user confirms exact target dates instead of relying solely on sheet
   names.
8. Raw uploads are transient and are removed after the preview lifecycle unless
   a separate retention policy is approved.
9. Parser failures provide safe row- or sheet-level guidance without exposing
   server paths or library internals.

**Definition of done**

- The parser and upload boundary are server-only and isolated behind the
  production-task import service.
- Security limits and transient-file cleanup are documented and tested.
- Fixture tests cover the supplied legacy workbook shape, merged cells, blank
  rows, formulas, malformed workbooks, oversized content, and unsafe links.
- Upload progress, cancellation where supported, errors, and sheet selection
  are keyboard and screen-reader accessible.
- No parsed workbook content is written to application logs or analytics.

### PT-12 — Resolve and validate imported rows

**User story**

As a supervisor or administrator, I want ambiguous people, areas, dates, and
rows called out before import so that I can correct the workbook without
silently assigning the wrong work.

**Acceptance criteria**

1. Exact employee codes resolve to active internal employee IDs.
2. Legacy comma- or Spanish `y`-separated assignee cells are parsed into
   candidate assignments.
3. Legacy names may produce suggested matches, but ambiguous or fuzzy matches
   require explicit user confirmation.
4. Similar values such as `Keni`/`Kenia`, `Haydee`/`Hyadee`, or accented and
   unaccented area names are never silently treated as authoritative matches.
5. Area text maps to a canonical area ID or requires an authorized mapping
   decision.
6. Blank rows are ignored; product-only rows are reported as skipped template
   candidates.
7. Task-without-assignee, assignee-without-task, unknown code, unknown area,
   and invalid date are blocking errors.
8. Potential duplicates are shown as conflicts rather than silently
   overwritten.
9. Preview summarizes additions, changes, duplicates, skipped rows, warnings,
   and blocking errors, with original sheet and row references.
10. The preview can be corrected and revalidated without re-uploading while its
    transient session remains valid.

**Definition of done**

- Normalization and matching are deterministic domain services with unit tests.
- Preview state is scoped to the uploading actor and expires safely.
- An allowlisted employee projection is used throughout mapping.
- Every accepted row resolves to exact dates, a canonical area, a meaningful
  description, and internal employee IDs.
- The supplied workbook produces an explainable preview in fixture tests,
  including its incomplete rows and legacy naming variations.
- Mapping controls are accessible, usable on mobile, and do not rely on color
  alone.

### PT-13 — Commit an approved import to a draft

**User story**

As a supervisor or administrator, I want an approved import preview committed
to a weekly draft so that I can review the resulting board before publishing
it.

**Acceptance criteria**

1. Only a current, authorized, fully validated preview can be committed.
2. Commit creates or updates a draft and never publishes it.
3. The operation shows the target week, selected sheets, and exact row counts
   before confirmation.
4. Existing draft conflicts produce a reviewed merge or replacement decision;
   the importer never silently overwrites them.
5. Imported tasks retain source sheet and row metadata for traceability.
6. The import audit records workbook hash, actor, timestamp, mappings, and
   result counts without copying task descriptions or employee names.
7. Replaying the same confirmed import does not create silent duplicates.
8. A failed commit leaves the previous draft unchanged and the preview
   recoverable when safe.
9. Success links directly to the weekly editor for final review and publication.

**Definition of done**

- Preview integrity, expiry, ownership, version, duplicate, and replay checks
  are enforced by the service.
- Draft mutation and audit insertion are transactional.
- Integration tests cover new draft, merge, replacement, conflict, retry,
  failure rollback, and unauthorized commit.
- The editor renders imported tasks exactly as canonical manual tasks; it does
  not require import-specific rendering.
- Import behavior and audit fields are documented.

## 9. Phase 4 — published visibility and execution

### PT-14 — View the published daily and weekly board

**User story**

As an authenticated application user, I want to view today's production work
and the complete weekly plan so that I understand both my responsibilities and
what the rest of the team is doing.

**Acceptance criteria**

1. `/tareas` is available to every authenticated, active user and defaults to
   the current Costa Rica business date.
2. `Hoy` and `Semana` views preserve selected week state in a shareable URL.
3. The current user's tasks are emphasized in `Mis tareas` without being
   duplicated in `Equipo completo`.
4. The full board includes every authorized published task and its assignees.
5. Tasks are grouped by date and canonical area in stable operational order.
6. Empty dates, areas, and task rows are omitted.
7. Users can filter by day, area, assignee, and completion state without losing
   access to the unfiltered board.
8. Task description is primary; product or element, area, assignees, and
   completion metadata are secondary.
9. Long descriptions and products wrap; the board remains usable at 320 CSS
   pixels and 200% zoom.
10. No draft, import, sensitive employee, schedule, or leave data appears in
    the published projection.

**Definition of done**

- The route, navigation item, loading skeleton, error boundary, empty states,
  metadata, and responsive board are implemented.
- Server queries return bounded, serializable, cache-safe view models.
- Daily grouping, week navigation, filter, time-zone, authorization, and
  projection tests pass.
- Keyboard, touch, screen-reader, light/dark, reduced-motion, and zoom checks
  pass.
- The board follows the established shared page-header style.

### PT-15 — See today's personal tasks on Inicio

**User story**

As a collaborator, I want Inicio to tell me whether I have tasks today so that
I can begin work without first searching the full weekly board.

**Acceptance criteria**

1. Inicio shows `Mis tareas de hoy` for every active user linked to an employee.
2. The module displays pending count, completed count, and a short ordered list
   of the current user's assigned tasks.
3. Each item shows its task first and product or element and area as secondary
   context.
4. `Ver todas las tareas` opens `/tareas?vista=mias` with the appropriate date
   context.
5. A user with no assignments sees `No tenés tareas asignadas para hoy` and can
   still open the complete board.
6. Drafts and tasks belonging only to other collaborators are absent from the
   personal summary.
7. A task completed elsewhere is represented consistently when Inicio is next
   refreshed or revalidated.
8. Failure to load task data does not prevent the rest of Inicio from loading.

**Definition of done**

- The homepage uses the feature's authorized summary query and does not import
  its repository.
- The query is bounded and covered by employee-link, date, publication,
  assignment, and status tests.
- Loading, isolated error, empty, pending, and completed presentations are
  implemented.
- Mobile, desktop, keyboard, screen-reader, and both-theme checks pass.

### PT-16 — Complete tasks from the user interface

**User story**

As an assigned collaborator, I want to complete a task from Inicio or the board
and see the shared result immediately so that the team has an accurate view of
finished work.

**Acceptance criteria**

1. Pending assigned tasks expose a clearly labeled completion control on both
   Inicio and `/tareas`.
2. Completing a task updates its shared state and displays the completing
   collaborator and localized time.
3. The same result is reflected in personal counts, `Mis tareas`, and `Equipo
completo` after revalidation.
4. Collaborators do not receive an enabled completion control for unassigned
   tasks.
5. Same-day undo is available only to the collaborator who completed the task,
   according to PT-06.
6. Supervisors and administrators can reopen a completed task through an
   explicit action.
7. Pending feedback prevents duplicate submissions while preserving keyboard
   focus and useful status announcements.
8. A stale update restores authoritative state and explains that the task
   changed instead of pretending the command succeeded.
9. Status is conveyed through text and iconography, not color alone.
10. Reduced-motion users receive no unnecessary completion animation.

**Definition of done**

- Both surfaces use the same Server Action or service command and shared status
  presentation rather than duplicating business rules.
- Optimistic interaction, authoritative revalidation, error recovery, and
  accessible live announcements are implemented.
- Assigned, unassigned, multi-assignee, undo, manager reopen, duplicate-click,
  stale-version, and failure tests pass.
- Manual testing confirms consistent state across two sessions viewing the same
  task.

## 10. Phase 5 — operational improvements

### PT-17 — Copy a previous week and reuse task patterns

**User story**

As a board manager, I want to copy a previous week and reuse recurring task
patterns so that weekly planning requires less repetitive entry.

**Acceptance criteria**

1. An authorized user can create a new draft from a selected prior revision.
2. Source dates are shifted to the confirmed target week while task identity
   and completion state are not copied incorrectly.
3. The user previews assignees who are now inactive or unavailable before save.
4. The copied week is a normal editable draft with provenance metadata.
5. Reusable patterns can capture area, product or element, task, and ordering
   without requiring an employee assignment.
6. Copying cannot overwrite an existing draft without an explicit conflict
   decision.

**Definition of done**

- Copy and template operations use domain commands, validation, authorization,
  version checks, transactions, and audit.
- Date-shifting, inactive-assignee, existing-draft, and no-completion-copy tests
  pass.
- Planning documentation explains copy and template behavior.
- Responsive preview and conflict resolution are accessible.

### PT-18 — Warn about schedules and approved leave

**User story**

As a board manager, I want warnings when an assignee is not scheduled or has
approved leave so that I can correct likely conflicts before publishing.

**Acceptance criteria**

1. Draft validation checks assigned employee IDs and exact task dates through
   production-task-owned Scheduling and PTO ports.
2. The editor distinguishes `No tiene horario ese día`, `Fuera del horario
configurado` when time windows exist, and `Tiene una ausencia aprobada`.
3. Warnings do not expose the leave category or private absence details.
4. Warnings do not automatically block save or publication.
5. Publication requires explicit acknowledgement of outstanding warnings.
6. A provider failure produces a visible `No se pudo verificar disponibilidad`
   warning rather than claiming that no conflict exists.
7. Collaborator board projections do not reveal schedule or leave warnings.

**Definition of done**

- Narrow integration ports and provider adapters are implemented without
  cross-feature repository imports.
- Working-day, alternating-week, effective-date, approved-leave, privacy,
  provider-failure, and acknowledgement tests pass.
- Warning copy and accessible presentation are reviewed in both themes and at
  mobile and desktop widths.
- Scheduling and PTO integration contracts are documented.

### PT-19 — Review revisions and assignment changes

**User story**

As a board manager or affected collaborator, I want material changes to a
published week to be understandable so that corrected instructions do not go
unnoticed.

**Acceptance criteria**

1. Supervisors and administrators can compare two revisions of the same week.
2. The comparison identifies added, removed, reassigned, rescheduled, and
   meaningfully edited tasks.
3. Task matching uses stable IDs where available and presents uncertain import
   matches for review.
4. Existing completion is not carried to a materially different task without
   an explicit manager decision.
5. Affected collaborators see a non-sensitive Inicio indication when their
   published assignment is added, removed, or changed.
6. Change indications link to the relevant published week and can be marked
   read without changing task state.
7. Audit and notification payloads contain IDs and change categories, not full
   task descriptions.

**Definition of done**

- Revision-diff rules are deterministic and tested.
- Notification read state remains separate from board and completion state.
- Authorization and projection tests prevent draft or unrelated employee data
  leakage.
- Responsive diff and notification experiences are accessible and documented.

## 11. Phase 6 — hardening and rollout

### PT-20 — Harden, migrate, pilot, and release the module

**User story**

As the organization, I want the production-task module migrated, observed, and
piloted safely so that the spreadsheet workflow can move into the application
without losing assignments or disrupting plant work.

**Acceptance criteria**

1. Production indexes and employee-code migration run through a reviewed,
   repeatable deployment procedure using migration-capable credentials.
2. A dry run reports employee-code counts, duplicate risks, plan counts, and
   index readiness without mutating production.
3. The supplied legacy workbook and at least one new-format workbook complete
   preview and draft import during staging validation.
4. A pilot supervisor or administrator can create, import, validate, publish,
   correct, and supersede a week.
5. Pilot collaborators can find their current tasks, inspect the full board,
   complete assigned work, and undo an accidental completion.
6. Monitoring covers safe operational counts, latency, errors, stale writes,
   import failures, and publication failures without logging workbook or task
   content.
7. Recovery procedures cover failed import, failed publication, mistaken
   publication, employee-code migration failure, and activity-store failure.
8. The old spreadsheet remains available as a temporary contingency during an
   agreed pilot window, but simultaneous edits are governed by one documented
   source-of-truth rule.
9. Accessibility, authorization, privacy, backup, retention, and security
   checks have named reviewers and recorded outcomes.
10. Support ownership and the process for reporting incorrect assignments are
    documented before general availability.

**Definition of done**

- All P0 acceptance criteria from the PRD and PT-01 through PT-16 are traced to
  passing tests or recorded manual verification.
- Production migration and rollback have been rehearsed in a representative
  non-production environment.
- End-to-end tests cover manual planning, workbook import, publication, public
  viewing, homepage summary, completion, undo, and manager reopening.
- Performance is validated with a realistically large week and active employee
  catalog.
- No critical or high-severity accessibility, authorization, data-integrity, or
  import-security issue remains open.
- Product and operational owners approve the pilot outcome and source-of-truth
  transition.
- The PRD, architecture documentation, employee model, feature documentation,
  operating guide, and support guide reflect the released behavior.

## 12. Suggested delivery shape

These ranges are planning aids, not commitments. They assume one engineer
familiar with the repository, timely product review, and access to representative
but non-sensitive workbook fixtures.

| Phase | Scope                              | Estimated effort |
| ----- | ---------------------------------- | ---------------: |
| 0     | Workflow validation                |         2–3 days |
| 1     | Identity and domain foundation     |        8–12 days |
| 2     | Manual planning and publication    |        7–10 days |
| 3     | XLSX import                        |        7–11 days |
| 4     | Published visibility and execution |         6–9 days |
| 5     | Operational improvements           |        7–11 days |
| 6     | Hardening, migration, and pilot    |         4–7 days |

The P0 path consists of Phases 0–4 and Phase 6, approximately **7–10 weeks**
for one engineer including review and polish. Phase 5 is a subsequent
improvement release. UI work can proceed alongside repository and parser work
after the Phase 1 contracts are stable, but authorization, lifecycle, and
import-mapping decisions should remain shared.

## 13. Release gates

The module must not become the production source of truth until:

- PT-01 resolves the multi-assignee completion rule;
- every active employee has a verified immutable employee code;
- role and direct-server-call authorization tests pass;
- workbook safety limits and cleanup are verified;
- an import cannot publish automatically;
- previous published revisions survive corrections;
- completion activity survives reopening and revision reconciliation;
- the homepage fails independently if the task service is unavailable;
- a representative workbook has completed staging import and review;
- production migration, rollback, monitoring, and support owners are approved.
