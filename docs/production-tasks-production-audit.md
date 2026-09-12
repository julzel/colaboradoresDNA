# Tasks production-readiness audit — 2026-09-12

Scope: `/tareas`, its import/history/edit flows, homepage task summaries, and the
`/api/production-tasks/v1` backend. The current UI and role policy remain the basis
for the feature: administrators and effective Producción supervisors manage work;
authenticated collaborators read published assignments.

## Findings addressed

- Imports and publication could bypass the past-date restriction enforced by direct
  editing. Both now protect historical task definitions and completion metadata.
  An unchanged historical row in a replacement import keeps its original ID and
  completion; removing, changing or adding historical work is rejected. The
  publication transaction rechecks the rule, including drafts left overnight.
- The task edit API lacked operation logging. It now records duration, outcome and
  safe error codes without employee names, task descriptions or credentials.
  Unexpected HTTP failures also emit a sanitized diagnostic event.
- Lost connections or non-JSON save responses could expose technical errors and
  invite blind retries. The editor now preserves input, focuses its error feedback,
  and directs the manager to refresh/review the plan when the outcome is uncertain.
  A synchronous submission guard prevents overlapping saves.
- Fresh installation did not explicitly create the collection used to serialize
  week edits. Bootstrap now owns `production_task_week_locks`; its dry run and
  repeated execution are exercised against a local MongoDB replica set.
- Integration tests depended on access to shared MongoDB. `pnpm test:tasks:integration`
  now starts a disposable local MongoDB 8.0.12 replica set, overrides connection
  settings, runs synthetic transaction/reset tests, and stops it afterward. No
  application environment file is loaded. The first run downloads MongoDB.
- A historical integration assertion expected names to require manual mapping;
  it now checks the current automatic unique-name matching behavior.

## Audit coverage

Reviewed manager authorization and employee/department eligibility, actor-owned
import previews, exact-origin mutation checks, JSON/upload limits, workbook ZIP
expansion limits and active-content rejection, DTO privacy, stale-version checks,
transaction rollback, revision history, multi-week moves, assignment notifications,
date boundaries, shared responsive UI and error handling. The backend API remains
independent of the React presentation. The production build and full automated
suite are part of verification; this is not a deployment.

## Data reset

`web/scripts/reset-production-tasks.mjs` requires an exact expected host and database
and defaults to a read-only dry run. Apply mode saves canonical Extended JSON in
`web/.local-backups/tasks-*/snapshot.ejson`, verifies its contents, then compares
each current collection against its snapshot inside a transaction. Only the
backed-up IDs are deleted. Concurrent changes abort the transaction or survive as
new records and are reported by the final check. Indexes are preserved.

Collections in scope: `production_week_plans` (draft/current/historical),
`production_task_assignment_changes`, `production_task_activity`,
`production_task_audit`, `production_task_import_previews`, and
`production_task_week_locks`. Area definitions, reusable task templates, employees,
and their separate audit records are preserved. Backups have private file permissions
and are ignored by Git. Restore with BSON Extended JSON parsing to retain ObjectIds
and dates; review current data before inserting backed-up documents.

Verified reset target: `colaboradores_dna_dev` on
`dnaturedev.ohltclp.mongodb.net`, from `web/.env.local`. This cleanup does not target
a separately configured production deployment.

## Completion record

- Full suite: 561 tests passed. Optional integration suites are skipped by the
  default test command; the task suites were run separately against local MongoDB.
- Local replica set: 11 integration tests passed, including cleanup isolation,
  backup contents, import rollback, concurrent creation, cross-week moves, past-date
  enforcement, and midnight publication checks. Model bootstrap passed a dry run
  and two consecutive apply runs locally.
- TypeScript, scoped ESLint/style checks, and the optimized Next.js build passed.
- `pnpm audit --prod --audit-level=high`: no known vulnerabilities found.
- Reset completed: 6 plan revisions, 14 assignment changes, 12 task audit records
  and 2 week locks removed. Activity and import previews were already empty.
  Post-reset counts were zero in all six task collections; 10 area definitions
  remain. No deployment was performed.
- Verified private recovery file: `web/.local-backups/tasks-mjHeNG/snapshot.ejson`.
  SHA-256: `eb80c9d58a5c85542052d9daa5bf256ae91ed9be81401d0b8ae08b7899d5cb15`.
