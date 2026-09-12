# Weekly tasks pilot PRD

Date: 2026-09-11. This pilot scope supersedes the broader UI roadmap in
production-tasks-prd.md; the existing headless domain remains in use.

## Outcome and scope

Replace the shared weekly spreadsheet with an authenticated, read-only production
board at `/tareas`. Administrators and supervisors currently assigned to the active
Producción department can import and publish. Other active users can read published
weeks and find their assigned work on Inicio and the board. Task editing and
completion controls are not part of this release.

## Source analysis

The supplied tasks_example.xlsx has one sheet, 46 task rows (25 shared assignments),
four work areas, a title, and five columns: Día,
Área de trabajo, Producto, Encargada and Tarea. Days and areas carry down through
blank cells, assignments may contain several natural names, and blank/product-only
template slots occur. No authoritative year or date range is supplied. Names are
not reliable identities and must never silently assign work.

## Product decisions and edge cases

- A plan is a Costa Rica calendar week, Monday through Sunday, inclusive. Show both
  dates before validation. No requirement to have tasks on every day. Multiple XLSX
  sheets can target distinct weeks; CSV represents one week. Arbitrary overlapping
  partial-week plans are intentionally avoided. Reject duplicate target weeks.
- New templates use immutable DNA employee codes and a protected code/name catalog.
  Never expose national IDs or personal emails. Legacy names require explicit
  employee mapping; unknown or partially resolved shared assignments block import.
- Dates in files are authoritative when present: support YYYY-MM-DD, YYYY/MM/DD and
  native Excel dates. Reject invalid dates, weekday mismatches and dates outside
  the selected week rather than silently moving work. Undated legacy weekdays map
  to the explicitly selected week.
- Validate file type/size, archive limits, headers, row lengths, required task/area/
  assignees, inactive employees, duplicates and task count. Return Spanish errors
  with sheet/row references. Ignore empty/template-only rows with visible counts.
- Preview is actor-owned, expires in two hours, and stores parsed data, not the raw
  upload. No automatic publication. Corrections to names/areas happen in import
  mapping; the task content itself remains read-only and is corrected in the file.
- Replacing existing work requires explicit confirmation of the exact target
  revision/version. Replaced drafts are also retained as superseded revisions.
  Recheck inside the transaction; concurrent updates force a
  fresh review. Import is atomic across selected sheets. Publication is explicit
  per week; previous published versions are superseded, never deleted.
- Availability warnings (schedule/approved leave/unavailable provider) are visible
  only to managers and require acknowledgement before publication. No leave reason
  or medical information is disclosed.
- Published past weeks remain accessible via date selection. Managers can inspect
  draft and superseded revisions in history. Preserve actor/time and source row
  provenance. Drafts never appear in collaborator queries.
- Homepage shows personal tasks for the current week (bounded summary), not only
  today. An isolated tasks failure must not take down Inicio.
- No data import into the live company database as part of implementation.

## Architecture and API

Vertical slice: domain → application contracts → authorized server use cases →
HTTP adapter / React presentation. UI cannot import repositories. All HTTP routes
live under `/api/production-tasks/v1`, use session authentication, no-store private
responses, bounded request bodies and same-origin checks for mutations. Roles and
effective department are checked server-side on every management request.

GET board, plans, plan detail and template; POST import preview, configure, commit
and publish. No task-edit or completion HTTP endpoints in the pilot. React uses
the same use cases for initial server rendering and HTTP for client mutations.
Transport contracts contain IDs/ISO dates, not Mongo objects or localized labels.

## UX / acceptance criteria

- Shared headers, typography, accent/brand tokens, controls and surface styles.
- Mobile-first full-width layouts. Grid scrolls within its container, not the page;
  cards summarize personal tasks. Readable wrapped descriptions, keyboard controls,
  labeled actions, live feedback, loading/error/empty states and both themes.
- Managers: template → upload → choose weeks/map errors → validate → confirm import
  → inspect read-only draft → acknowledge warnings/replacement → publish.
- Collaborators: navigate to Tareas, choose any week, see own tasks and full team.
- Unauthorized/direct API calls cannot bypass department or publication boundaries.
- Verification covers parsing, dates, shared assignments, permission matrix, stale
  imports, HTTP safety, DTO privacy, UI rendering and existing domain regression.

## Rollout

Run employee/task bootstrap dry runs and migrations with migration credentials,
then stage a synthetic import/publication/replacement and test real mobile layouts.
Choose one source of truth per week during pilot. No deployment or live imports
are implicit in implementation. Retention is indefinite for published revisions;
raw uploads are not retained. A broader retention policy can be agreed later.
