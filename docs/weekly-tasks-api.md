# Weekly tasks API and implementation notes

Pilot implementation: 2026-09-11. Product scope: [PRD](weekly-tasks-pilot-prd.md).

## Entry points

| Route                                 | Access                                 | Purpose                                                       |
| ------------------------------------- | -------------------------------------- | ------------------------------------------------------------- |
| `/tareas?fecha=YYYY-MM-DD&vista=mias` | Active authenticated users             | Published weekly grid and personal assignments                |
| `/tareas/importar`                    | Admin or current Producción supervisor | Template, upload, mapping, validation and import confirmation |
| `/tareas/historial?fecha=YYYY-MM-DD`  | Managers                               | Most recent 104 revisions, optionally restricted to a week    |
| `/tareas/planes/:id`                  | Managers                               | Read-only revision, warnings and explicit publication         |
| Inicio                                | Active authenticated users             | Up to four personal tasks this week, upcoming tasks first     |

The mobile navigation includes Tareas under Más. Desktop navigation includes it
in Espacio de trabajo. Nested breadcrumbs return to Tareas on desktop and mobile.

## HTTP contract

Base: `/api/production-tasks/v1`. Session-cookie authentication, including the
existing verification/MFA/access policy. Responses use `Cache-Control: private,
no-store` and `Vary: Cookie`. Mutations require the application's exact Origin.
No wildcard CORS and no client-supplied actor/role authority.

| Method | Path                           | Input                                                                         | Success                                                  |
| ------ | ------------------------------ | ----------------------------------------------------------------------------- | -------------------------------------------------------- |
| GET    | `/board`                       | `date` (optional ISO date), `view=day\|week`, optional `areaId`, `assigneeId` | `{data: ProductionBoardResult}`                          |
| GET    | `/plans`                       | optional `date`                                                               | `{data: ProductionPlanningDashboardResult}`              |
| GET    | `/plans/:id`                   | ObjectId                                                                      | `{data: ProductionPlanEditorResult}`                     |
| GET    | `/template`                    | none                                                                          | XLSX attachment with current code/name and area catalogs |
| POST   | `/imports?filename=tasks.xlsx` | Raw XLSX or CSV bytes, ≤8 MiB                                                 | 201 `{data: ProductionImportPreviewResult}`              |
| GET    | `/imports/:id`                 | Actor-owned preview ID                                                        | Current preview and current target versions              |
| POST   | `/imports/configure`           | JSON configuration below                                                      | Validated preview and fresh target versions              |
| POST   | `/imports/commit`              | JSON confirmation below                                                       | 201 `{data:{planIds:string[]}}`                          |
| POST   | `/publish`                     | `{planId, expectedVersion, acknowledgeWarnings, confirmed:true}`              | `{data:{planId}}`                                        |

Configuration:

```typescript
{
  previewId: string;
  expectedVersion: number;
  sheets: { name: string; selected: boolean; weekStart: string | null;
            mode: "merge" | "replace" }[];
  rows: { key: string; areaId: string | null; assigneeEmployeeIds: string[] }[];
}
```

The pilot UI uses `replace`. The existing API core also supports merge, with
duplicate detection and the same explicit target confirmation. Every original
sheet and row must be represented in configuration. Task content is not editable
through configuration. Correct that content in the source file and upload again.

Commit:

```typescript
{
  previewId: string;
  expectedVersion: number;
  overrideConfirmed: boolean;
  targets: {
    weekStart: string;
    draft: { id: string; version: number } | null;
    published: { id: string; version: number } | null;
  }[];
}
```

Send the exact `targets` returned by the validated preview. Existing target weeks
require `overrideConfirmed:true`. A stale preview/target returns 409 and requires
a new review, not an automatic overwrite. Consumed/expired previews cannot commit
again. Multiple selected weeks commit atomically. Publication is separate per week.

Errors use `{code?, error, fields?}` with Spanish guidance. Statuses: 400 malformed
input; 401 no session; 403 access/origin/MFA; 404 missing resource; 409 stale version
or unconfirmed conflict; 413 oversized body; 422 domain/file validation; 500
unavailable service. Unexpected errors never expose stack traces or workbook text.
JSON commands are capped at 1 MiB of actual streamed bytes.

## File behavior and safety

- CSV: UTF-8, optional BOM, comma or semicolon separated, RFC-style quoting and
  escaped quotes. One task sheet/week. Text is not evaluated as a formula.
- XLSX: up to 30 sheets, 2,000 rows/sheet, 50,000 inspected task cells, 2,000 ZIP
  entries, 8 MiB compressed/80 MiB expanded. Real bounded inflation validates
  declared ZIP entry sizes before ExcelJS loads the workbook. Reject macros,
  external workbook links, malformed ZIPs and unsupported file extensions.
- Formulas are not executed. Existing cached results are flagged for review.
- Dates accept native Excel dates, YYYY-MM-DD or YYYY/MM/DD, with exact calendar
  validation. Explicit dates must match the selected week and optional weekday.
- Legacy blank day/area cells carry forward. Blank/product-only template slots
  are counted as skipped. Task-without-assignee and incomplete shared assignments
  block import. Exact DNA codes resolve automatically; natural names never do.
- At most 500 tasks per final week, including a merge's previous tasks. Duplicate
  rows and repeated target weeks are blocked. An inactive assignee blocks publication.
- A downloadable blank template is at `outputs/weekly-tasks-pilot/plantilla-tareas.xlsx`.
  Prefer the authenticated in-app template: its catalogs are current. The blank
  copy deliberately contains no company employee data.

## Boundaries and history

React presentation and the HTTP adapter call only `production-task-application.ts`.
The server owns authorization, validation and persistence. Contracts have strings,
numbers and ISO dates; no React labels, Mongo values or transport objects. Provider
adapters own effective department and employee-label queries. Published responses
contain only operational labels for assigned employees, including former employees,
not email addresses, national IDs, leave details or the full employee directory.

Imports use transactions and optimistic target versions. Replacement of a draft
retains it as a superseded revision; replacing published work also retains the old
published revision. Audit includes actor, timestamp, changed fields, source hash,
mapped IDs and counts. Source sheet/row is retained on tasks. Published/superseded
plans have no destructive deletion operation in this UI. Previews expire after two
hours; the original uploaded binary is not retained. Existing completion/manual
editing/copying core commands remain unexposed by this pilot HTTP/UI adapter.

The homepage task section streams independently and reports a local error if its
store is unavailable. Controls follow existing components/tokens; the module
darkens brand CTA backgrounds to meet contrast with the required white text.

## Verification and rollout

Automated coverage includes parser/CSV/date/mapping limits, management permission
matrix, HTTP origin/auth/body/error contracts, readonly grid, import confirmation,
navigation, template catalogs, and the existing domain/revision tests.

An opt-in test exercises real repositories and transactions in a new random
`dna_tasks_<24-hex>` database and removes only that validated synthetic database:

```bash
cd web
RUN_TASKS_LIVE=1 node --env-file=.env.local ./node_modules/vitest/vitest.mjs run tests/integration/production-tasks-mongodb.test.ts
```

It covers effective departments, template round-trip, preview ownership, legacy
names, publication visibility, personal assignments, explicit replacement, retained
revisions (including replaced drafts), expiry, replay prevention, concurrent first
imports, stale versions, former-employee labels and multi-week transaction rollback.
Component browser fixtures use synthetic data for 320px/1440px, light/dark, overflow
and accessibility checks. This is not a substitute for a signed-in pilot walkthrough
on real iOS/Android devices.

Deployment still needs the existing employee/task bootstrap procedure documented
in [production-tasks.md](production-tasks.md), followed by a signed-in staging
walkthrough. Implementation does not import the supplied workbook into live plans,
change the application database or deploy the code.

Development setup completed on 2026-09-11 using
`pnpm bootstrap:production-tasks-model` after the runtime readiness guard reported
the missing catalog. A read-only postcheck confirmed 10 active task areas and both
the current-week unique index and preview expiry index. Preflight and postflight
reported no missing employee codes, no task plans and no conflicting current slots.
The idempotent bootstrap initialized the catalog and indexes without changing
collaborators or importing tasks. Other environments still require their own setup.

Verification result: 533 default-suite tests passed; six opt-in real-database
scenarios passed in disposable synthetic databases. Build, TypeScript, formatting,
and Stylelint passed. ESLint has no errors and one pre-existing warning in the PTO
accrual function. Synthetic browser checks passed at 320px and 1440px in light and
dark themes, including import confirmation, with no page overflow or Axe violations.

Implementation reference: [Next.js authentication guidance](https://nextjs.org/docs/app/guides/authentication)
requires authorization at server entry points, including Route Handlers. This
adapter also leaves the same checks in the core use cases.
