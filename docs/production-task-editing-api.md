# Direct task editing

Implemented 2026-09-12. Extends the [weekly tasks API](weekly-tasks-api.md).

## Behavior

Administrators and active Producción supervisors can create, edit, move and
remove published tasks directly from `/tareas`. Other collaborators retain
read-only access. The editor uses shared form controls and a responsive dialog,
with searchable, multiple collaborator selection and explicit delete confirmation.

Only today and future dates are editable, using `America/Costa_Rica`, not the
browser timezone. Moving a task validates both its original and destination dates;
past tasks cannot be moved to circumvent the restriction. Valid dates need not be
Mondays and can belong to a different week or a week without a published plan.

Saving publishes immediately. Each affected week receives an immutable historical
revision; cross-week moves are atomic. Removing the final task publishes an empty
week rather than losing history. Unchanged tasks retain their completion metadata;
editing a completed task does not reopen it. Audit records identify the authenticated
actor, affected task and plans. Assignment-change records notify affected employees
through the existing task-change mechanism.

An active draft in either affected week blocks the command (`pending_draft`): resolve
it through the existing publication workflow first. Week locks serialize direct
editing with draft creation, imports and publication. They use the
`production_task_week_locks` collection, keyed by ISO week-start date, with MongoDB's
default unique `_id` index. Existing plan indexes and transaction-capable MongoDB
remain required. No new external service or UI dependency is required.

## API

Base: `/api/production-tasks/v1`. All endpoints below require manager permission.
Existing session authentication, exact-origin mutation checks, JSON size limits and
private/no-store response headers apply. The frontend only consumes JSON contracts;
validation and persistence live in the domain/application/server layers.

### GET `/tasks/options?date=YYYY-MM-DD`

Returns `{data: {today, targetPlanId, areas, employees}}`. `targetPlanId` is the
current published plan for the destination week, or `null`. Employee options expose
IDs, names and employee codes; only active employees and areas are offered.
Refresh options when the destination date changes.

### POST `/tasks/edit`

Create:

```typescript
{
  action: "create";
  expectedTargetPlanId: string | null;
  acknowledgeWarnings?: boolean;
  task: {
    workDate: string; // YYYY-MM-DD
    areaId: string;
    assigneeEmployeeIds: string[]; // 1–30 unique active employee IDs
    description: string;
    subject: string; // empty string allowed
    sortOrder: number; // nonnegative integer; server chooses insertion position
  };
}
```

Update uses the same fields, with `action: "update"` and:

```typescript
source: {
  planId: string;
  taskId: string;
  expectedTaskVersion: number;
}
```

Remove sends only `{action: "remove", source}`. Actor IDs and roles are never
accepted from the client. Source IDs/version come from the published board; the
destination plan ID comes from the options endpoint. Commands reject stale source
or destination revisions rather than silently overwriting another manager's work.

Success: `{data: {taskId, date, planIds: string[]}}`. Refresh the board using `date`.

Errors follow `{code, error, fields?, warnings?}`. Malformed fields return 400;
unauthenticated/unauthorized requests return 401/403; stale revisions and pending
drafts return 409; invalid domain operations return 422. Important codes:

- `task_date_past`: original or destination date is before today.
- `stale_version`: reload the board and review the latest task before retrying.
- `pending_draft`: resolve the existing draft in an affected week.
- `active_employee_required` / `area_not_found`: refresh and correct selections.
- `task_limit`: destination week would exceed 500 tasks; no changes are committed.
- `warnings_unacknowledged`: `warnings` contains `approved_leave`, `not_scheduled`
  and/or `availability_unknown`. Show the warnings and require explicit confirmation
  before resubmitting with `acknowledgeWarnings: true`. Editing fields resets that
  confirmation. These warnings do not mean availability was successfully verified.

## Verification

Unit/component/HTTP tests cover authorization, Costa Rica date boundaries, past
source and destination protection, invalid selections, optimistic concurrency,
availability confirmation, multi-assignee editing, and delete confirmation.

`web/tests/integration/production-task-edit-mongodb.test.ts` additionally exercises
revision history, cross-week moves, empty weeks and concurrent edits using an isolated
temporary database. It is opt-in (`RUN_TASK_EDIT_LIVE=1`) and creates/deletes that
database. Its execution requires explicit authorization for the configured MongoDB
destination; it was not verified against a live database during this implementation.
