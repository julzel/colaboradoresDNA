# Production tasks

## Status and scope

The `production-tasks` slice implements the production board described in the
[PRD](./production-tasks-prd.md) and
[implementation roadmap](./production-tasks-roadmap.md). The backend slice is
implemented as a headless application core. Its original Next.js presentation
was intentionally removed before the replacement UI is designed.

The published application board is the source of truth. XLSX files are import
and controlled export formats only.

## UI status and access

There are currently no Tasks routes, navigation entries, homepage widgets,
components, Server Actions, styles, or view models. The former `/tareas` UI has
been removed. The PRD and roadmap retain the intended route and workflow design
as input for the replacement interface.

Authorization remains enforced inside the application services: published-board
queries require an active authenticated user, while planning, imports, catalogs,
and publication require supervisor or administrator access. The service derives
the actor and employee from the authenticated session; client-submitted roles or
actor identifiers are never authoritative.

## Slice boundaries

```text
Future UI / transport adapter
        │ presenters + transport mapping
        ▼
public production-task application entry
        │ transport-neutral result DTOs
        ▼
authorized use cases and domain rules
        │
        ├── repositories
        └── production-task-owned integration ports
              ├── Scheduling
              ├── PTO
              └── Employees
```

- `application/` owns the stable, transport-neutral query contracts, result
  DTOs, import resolution, and workbook error codes. Results contain plain IDs,
  ISO timestamps, statuses, warning codes, and permission facts—never formatted
  labels, React types, `FormData`, redirects, or MongoDB values.
- `domain/` owns task, plan, import, date, revision-diff, and validation rules.
- `server/` owns MongoDB persistence, lifecycle orchestration, workbook parsing,
  template/export generation, and audit writes.
- `server/production-task-application.ts` is the only server entry point that a
  presentation adapter may import. It exposes authenticated use cases without
  exposing repositories or provider clients.
- `integrations/` contains production-task-owned ports. Provider-owned adapters
  expose redacted Employee, Scheduling, and PTO facts.
- There is currently no presentation adapter. A future UI will own localized
  labels, display-date formatting, board grouping, transport parsing, navigation,
  and cache invalidation.

The dependency direction is one-way: presentation may depend on application
contracts, while `application/`, `domain/`, `integrations/`, and `server/` may
not import presentation code. Architecture tests enforce this direction and
also prevent the application layer from importing Next.js, MongoDB, or internal
server modules.

### Replacing the UI

A replacement Next.js UI must call use cases only through
`server/production-task-application.ts`, then map the neutral result DTOs into
its own view models. New Server Actions translate their transport input into
use-case arguments; use cases must never accept `FormData` or perform navigation.

The original task routes plus `actions/`, `components/`, `presentation/next/`,
and `view-models/` have been removed. The application contracts, domain,
integrations, services, repositories, workbook processing, and business-rule
tests remain usable. If a non-Next client is added later, an authenticated HTTP
adapter can call the same public application entry without changing the core.

Scheduling checks expose only scheduled/not-scheduled/unknown. PTO checks expose
only whether approved leave overlaps the date; leave category and notes never
enter the task slice.

## Identity and task model

Every collaborator receives an immutable operational code such as `DNA-0042`.
The code is generated from the atomic `employee_sequences.employee_code`
counter and is displayed in collaborator administration and the XLSX catalog.
Tasks store internal employee ObjectIds; names, emails, codes, and national IDs
are not task relationships.

A weekly plan contains exact Costa Rica business dates, a revision, an
optimistic-concurrency version, and one of these states:

- `draft`: editable and invisible on the published board;
- `published`: the single current revision for its week;
- `superseded`: immutable retained history.

Publishing and superseding happen in one transaction. Editing a published week
creates a draft revision. Stable task IDs are retained across revisions, while
completion is retained only when the task definition is unchanged. Materially
edited tasks keep comparison identity but reset completion.

A shared task has one completion state. Any assigned collaborator completes it
for the group. The completing collaborator can undo their own completion during
the same `America/Costa_Rica` business date. Supervisors and administrators can
complete or reopen any task. Every transition uses a task version and appends
activity and content-free audit records in the same transaction.

## Planning and operational improvements

Managers can create a week, add/duplicate/reorder/remove tasks, select several
active collaborators, preview the collaborator board, and explicitly publish.
The searchable assignee picker matches name, email, and `DNA-####` code while
showing name and code as its visible identity.

The planning dashboard supports:

- copying a prior revision into another week without copying completion state;
- reusable task patterns containing area, product/element, and task but no
  employee assignment;
- an editable canonical area catalog; archived areas remain on historic task
  snapshots but cannot be selected for new work;
- controlled XLSX export of a selected revision;
- warnings for approved leave, unscheduled dates, and provider failures;
- explicit warning acknowledgement before publication;
- deterministic added, removed, reassigned, rescheduled, and edited comparisons
  against the prior revision.

Affected collaborators receive a non-sensitive indication on Inicio after a
published assignment changes. The record contains employee, plan, task,
revision, and change category IDs—not task descriptions—and has independent
read state.

## XLSX import contract

The importer accepts `.xlsx` only and never executes formulas. Cached formula
results may be displayed with a warning. Macros and external workbook links are
rejected. Limits are enforced at the upload/parser boundary:

| Limit                          |                                     Value |
| ------------------------------ | ----------------------------------------: |
| Compressed upload              |                                     8 MiB |
| Declared decompressed archive  |                                    80 MiB |
| ZIP entries                    |                                     2,000 |
| Worksheets                     |                                        30 |
| Rows per task sheet            |                                     2,000 |
| Inspected task cells           |                                    50,000 |
| Imported tasks per target week |                                       500 |
| Cell text                      | 2,000 characters before domain validation |
| Preview lifetime               |                                   2 hours |

The parser recognizes the legacy columns `Día`, `Área de trabajo`,
`Producto`/`Producto-Zona`, `Encargada`/`Encargado n`, and `Tarea`. It
forward-fills merged day and area context in memory, ignores truly empty
template slots, separates legacy assignee lists on commas or Spanish `y`, and
excludes `Original` by default. Exact codes resolve automatically. A unique
exact normalized name may be proposed; ambiguous or unknown people remain a
blocking row until a manager selects the employee explicitly.

Rows require a confirmed target Monday, recognizable weekday, canonical area,
meaningful task, and at least one active employee. Potential duplicates are
blocking. Import review can merge into or replace a draft; it never publishes.
All selected-sheet writes, content-free audit data, and preview consumption
commit in one transaction. Audit metadata includes workbook SHA-256, counts,
mode, and mapped IDs without names or task content.

### Guía corta de la plantilla

1. Descargá la plantilla desde **Importar tareas**.
2. Ingresá la fecha, día, área, producto o elemento y tarea.
3. Usá los códigos de la hoja protegida **Colaboradores** en las columnas
   `Encargado`. No uses cédula ni correo.
4. Cargá el archivo, confirmá el lunes de cada semana y resolvé todos los errores.
5. Elegí **Agregar al borrador** o **Reemplazar borrador**, importá y revisá el
   editor. La publicación siempre es un paso separado.

The hidden `_Configuración` sheet carries `template_version=1` and the Costa
Rica timezone. The collaborator catalog contains code and display name only.

## Collections

- `production_week_plans`
- `production_areas`
- `production_task_templates`
- `production_task_activity`
- `production_task_assignment_changes`
- `production_task_import_previews` (TTL)
- `production_task_audit`
- `production_area_audit`
- `production_task_template_audit`

Task and workbook text is intentionally absent from audit and assignment-change
records. Published revisions and activity records have no normal hard-delete
workflow.

## Setup, migration, and verification

Run the employee bootstrap before the task bootstrap:

```bash
cd web
pnpm bootstrap:employee-model
pnpm bootstrap:production-tasks-model -- --dry-run
pnpm bootstrap:production-tasks-model
```

The dry run reports only safe counts: employees missing a code, plan count, and
duplicate current slots. Resolve any duplicate slot and ensure the missing-code
count is zero before the write run. Both scripts require migration-capable
credentials; normal runtime credentials should not be granted collection or
index administration solely for these commands.

Before rollout, run `pnpm verify` and `pnpm test:e2e`, then validate both the
provided legacy workbook and a downloaded current template against a synthetic
staging database.

## Recovery and rollout checklist

- **Failed employee-code migration:** stop before task rollout, restore the
  pre-migration backup if any existing code changed, correct duplicates, and
  rerun the idempotent bootstrap. Never renumber a code already issued.
- **Failed import:** no published data changes. Correct the preview while it is
  valid or upload again; a failed transaction leaves all prior drafts intact.
- **Mistaken draft import:** edit the draft or use a reviewed replacement import.
- **Failed publication:** the previous published revision remains current and
  the draft remains recoverable.
- **Mistaken publication:** create a revision from the published week, correct
  it, preview, and publish; do not delete history.
- **Failed activity/audit write:** the transaction rolls back the task change.
- **Contingency spreadsheet:** during the pilot, designate either the published
  app board or the spreadsheet as the source of truth for each week—never both.

Production enablement requires named owners to record:

- staging migration and rollback rehearsal;
- supervisor create/import/publish/correct walkthrough;
- collaborator daily/weekly/complete/undo walkthrough;
- mobile, desktop, 320px, 200% zoom, keyboard, screen-reader, light, and dark
  theme checks;
- authorization/privacy review;
- backup/retention review;
- monitoring and support ownership.

Operational monitoring should emit counts, latency, and typed failure codes for
preview, import, publish, completion, and stale-write operations. It must not log
workbook cells, task text, employee names, leave details, or credentials.
