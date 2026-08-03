# User story: PTO balances and absence requests

## Status

**Status:** Implemented for the MVP. The documented non-goals remain out of
scope; future policy changes should extend the existing domain and audit model.

**Priority:** MVP.

**Interface name:** `Solicitudes de ausencia`.

**Internal domain name:** `pto`.

**Primary roles:** Collaborator, supervisor, and administrator.

**Related specifications:**

- `tasks/done/employee-management-user-story.md`
- `tasks/done/employee-model.md`
- `tasks/done/calendar-roadmap.md`
- `tasks/done/profile-roadmap.md`
- `docs/architecture.md`
- `docs/employee-model.md`
- `docs/design-system.md`

## Primary user story

As an active collaborator, supervisor, or administrator, I want to draft,
submit, follow, and when permitted cancel an absence request so that the
appropriate person can make an auditable decision and the approved absence is
reflected in the applicable balance and authorized calendars.

## Supporting user stories

### Requester

As a requester, I want to see my current balance and projected balance before
submitting, including clear non-blocking warnings, so that I can make an
informed request without the application silently rejecting a valid negative
balance.

### Approver

As an assigned approver, I want to review only requests within my authorized
scope and approve or deny them with an optional note so that decisions follow
the reporting and role rules without self-approval.

### Administrator

As an administrator, I want to assign opening balances and record reasoned
adjustments so that every employee starts from a known balance and every change
can be reconstructed from an immutable ledger.

As an administrator, I want to create and manage a request on behalf of an
employee so that an absence can be recorded through the same audited workflow
when the employee cannot create it themselves.

## Product outcome

The application provides a Spanish, mobile-first `Solicitudes de ausencia`
area in which:

- Every active employee can maintain drafts and submit their own requests.
- Collaborator requests snapshot their assigned supervisor when submitted.
- Any active administrator can approve or deny any pending request except their
  own; an assigned supervisor can act on requests routed to them.
- Opening balances, manual adjustments, and approved-request effects form one
  auditable balance ledger.
- Half-day values are exact and never depend on floating-point arithmetic.
- Negative balances are supported and produce warnings rather than blockers.
- Approved absences become a privacy-safe calendar source.
- An administrator can create a request for an active employee while preserving
  that employee as the requester for balance, routing, calendar, and
  self-approval rules.
- Upcoming approved requests created by an administrator notify the employee in
  Inicio; the employee can mark those notifications as read.
- Clerk remains responsible only for identity; MongoDB remains authoritative
  for employees, roles, assignments, requests, balances, and authorization.

## Findings from the current project

The implementation should extend existing boundaries rather than introduce a
second application pattern:

1. `requirePlatformUser()` is the server authorization boundary and already
   rejects signed-out, deactivated, unlinked, and non-MFA privileged users.
2. `platform_users.role` is authoritative for `administrator`, `supervisor`,
   and `collaborator` roles.
3. `employee_assignments` is effective-dated and already stores
   `managerEmployeeId`; it must be used to resolve the requester's current
   reporting line on submission.
4. Employee creation already uses a MongoDB transaction for the platform user,
   employee, initial assignment, initial schedule, and audit writes. Opening
   balance creation belongs in that same transaction.
5. The calendar consumes a normalized `CalendarEntry` projection. Its roadmap
   explicitly reserves approved absences as a future entry source.
6. Existing audit repositories store actor, target, action, changed field names,
   and timestamp without copying sensitive values. PTO should follow that
   pattern and use its own feature-owned audit collection.
7. There is no team schedule view today. Calendar integration is required for
   this delivery; a privacy-safe absence projection should also be reusable by
   a future schedule view.

## Scope decisions and recommendations

### Exact half-day storage

Never store or calculate day balances as binary floating-point numbers. Store
integer half-day units:

```ts
type PtoUnits = number; // integer; 1 unit = 0.5 day

function unitsToDays(units: PtoUnits) {
  return units / 2;
}
```

Examples:

| User-facing days | Stored units |
| ---------------- | ------------ |
| `0.5`            | `1`          |
| `1`              | `2`          |
| `7.5`            | `15`         |
| `-1.5`           | `-3`         |

Every persisted duration, opening balance, adjustment, and balance snapshot
must be an integer number of units. Forms may accept `0.5`-step decimal input,
but the server must normalize it to units before persistence.

### One current balance plus an immutable ledger

Use a materialized current balance for fast reads and an append-only ledger for
auditability. Do not reconstruct the normal page balance by summing the entire
ledger on every request, and do not permit direct updates to the current value
without a corresponding ledger entry.

### Approver assignment and administrator pool

`assignedApproverPlatformUserId` is resolved for collaborator requests when
they are submitted. It remains a historical snapshot even if the requester's
assignment or the supervisor's role later changes. Pending requests never
silently reroute.

Supervisor and administrator requests enter the shared administrator approval
pool and keep `assignedApproverPlatformUserId` as `null`. Any active
administrator may decide any pending request except their own. Active
administrators may also decide collaborator requests as an authorized override.

If a snapshotted approver becomes inactive before deciding, an administrator
must use an explicit audited reassignment operation. Reassignment must exclude
the requester and include only an approver eligible under the requester's role
rule.

No named individual receives special routing and requesters do not select an
administrator. This avoids hard-coded people, mutable-name matching, and an
unnecessary single point of failure.

### Approved requests are terminal

The supplied workflow allows cancellation only from `draft` or `pending`.
Therefore `approved` and `denied` are terminal in this MVP. Correcting an
approved request requires a separately designed reversal/amendment workflow;
editing the request, deleting it, or changing it to cancelled is not allowed.
A balance adjustment may correct accounting but does not rewrite request
history or remove the calendar entry.

### Dates and duration

- Dates use `YYYY-MM-DD` business dates in `America/Costa_Rica`.
- `startDate` must be on or before `endDate`.
- `durationUnits` must be an integer of at least `1` (`0.5` day).
- The duration may not exceed the inclusive calendar-day span expressed in
  half-day units.
- The system does not automatically remove weekends, holidays, or non-working
  schedule days because those policies are not defined.
- Past-date submission is not rejected unless a separate product rule is
  approved later.
- A `0.5`-day request has no morning/afternoon placement because that datum is
  not part of the supplied requirements. The calendar must present it as an
  all-day absence with a visible `0.5 día` duration and must not imply a time.

### Overlap warning

An overlap exists when the request range intersects another request by the same
employee whose status is `pending` or `approved`:

```text
candidate.startDate <= existing.endDate
AND candidate.endDate >= existing.startDate
```

Overlap is a warning, not a blocker. Denied and cancelled requests do not
produce overlap warnings. The current draft is excluded from its own check.

### Implemented in-app notification scope

The MVP does not send email, push, or Slack notifications. It does provide an
in-app dashboard notification for an upcoming approved PTO request that an
administrator created on behalf of an employee:

- The notification appears on Inicio as `Ausencia aprobada`, includes the
  category and dates, and links to the request detail.
- It remains visible through the request end date, alongside other upcoming
  notifications; Inicio shows the five nearest items.
- Read state is per platform user and notification key in
  `dashboard_notification_reads`. Unread items receive a `Nueva` treatment and
  Inicio's navigation item shows an unread count (capped visually at `99+`).
- Opening the notification marks it read. The user can also mark all current
  notifications as read.
- Read state is a presentation concern only: it does not alter PTO status,
  balance, authorization, or audit history.

## Confirmed product decisions

### 1. Category balance effects

The MVP uses one generic absence balance. All categories consume that balance
when approved:

| Category   | Balance effect |
| ---------- | -------------- |
| `vacation` | `-duration`    |
| `sick`     | `-duration`    |
| `personal` | `-duration`    |
| `other`    | `-duration`    |

Recommended model:

```ts
type PtoBalanceEffect = {
  balanceDeltaUnits: number | null;
  balanceBeforeUnits: number | null;
  balanceAfterUnits: number | null;
};
```

Approval sets the delta to `-request.durationUnits` and records before/after
snapshots. The mapping lives in the tested `ptoCategoryConsumesBalance` domain
record so a later policy change has one controlled implementation boundary.

### 2. Who may read approved absences beyond the requester and approver?

The implemented privacy-minimizing scope is the requester, the assigned
approver, and administrators. Approved absences are not visible to department
colleagues or the entire company.

## PTO categories

Use exactly these internal enum values and Spanish labels:

| Code value | Spanish label    |
| ---------- | ---------------- |
| `vacation` | Vacaciones       |
| `sick`     | Enfermedad       |
| `personal` | Permiso personal |
| `other`    | Otro             |

Category labels are presentation data. They do not imply separate balances,
allowances, accrual rates, documentation requirements, or approval rules.

Use these status labels consistently in the interface:

| Code value  | Spanish label |
| ----------- | ------------- |
| `draft`     | Borrador      |
| `pending`   | Pendiente     |
| `approved`  | Aprobada      |
| `denied`    | Denegada      |
| `cancelled` | Cancelada     |

## Workflow state machine

```text
Draft → Pending → Approved
                ↘ Denied
Draft/Pending → Cancelled
```

Allowed transitions:

| From      | Action  | To          | Actor                            |
| --------- | ------- | ----------- | -------------------------------- |
| —         | Create  | `draft`     | Requester or proxy administrator |
| `draft`   | Edit    | `draft`     | Requester or proxy administrator |
| `draft`   | Submit  | `pending`   | Requester or proxy administrator |
| `draft`   | Cancel  | `cancelled` | Requester or proxy administrator |
| `pending` | Approve | `approved`  | Assigned authorized approver     |
| `pending` | Deny    | `denied`    | Assigned authorized approver     |
| `pending` | Cancel  | `cancelled` | Requester or proxy administrator |

Every other transition is rejected on the server, including direct status
mutation, self-approval, editing pending requests, reopening terminal requests,
and cancelling approved requests.

## Authorization matrix

| Capability                            | Collaborator | Supervisor | Administrator |
| ------------------------------------- | ------------ | ---------- | ------------- |
| View own requests and balance         | Yes          | Yes        | Yes           |
| Create/edit own draft                 | Yes          | Yes        | Yes           |
| Submit/cancel own eligible request    | Yes          | Yes        | Yes           |
| Create/manage a draft for an employee | No           | No         | Yes           |
| View requests assigned to them        | No           | Yes        | Yes           |
| Approve/deny authorized request       | No           | Yes        | Yes           |
| Approve/deny own request              | No           | No         | No            |
| View all balances and ledger          | No           | No         | Yes           |
| Enter opening balance                 | No           | No         | Yes           |
| Adjust a balance                      | No           | No         | Yes           |
| Reassign an orphaned pending request  | No           | No         | Yes           |
| View all requests for audit           | No           | No         | Yes           |

An active administrator may approve or deny any pending request except their
own, including a request they created on behalf of another employee. The
employee—not the proxy creator—is the requester for the self-approval rule.
Hiding a button is never the authorization boundary.

## Approver resolution rules

For a self-service request, resolve the requester from the authenticated
`platformUserId`; never accept a requester platform-user ID from the client.
For an administrator-created request, accept only an employee ID, verify the
administrator on the server, load the active employee and their linked platform
user, and derive both requester IDs from those server-owned records. Keep the
employee as requester and record the administrator separately as the creator.

### Collaborator requester

1. Find the requester's effective assignment on the submission date.
2. Require `managerEmployeeId`.
3. Resolve that manager's linked active platform user.
4. Require the manager's platform role to be `supervisor` or `administrator`.
5. Require manager and requester to be different people.
6. Snapshot that eligible manager as the approver.

Do not silently fall back to an administrator when the collaborator lacks an
eligible assigned supervisor. Submission is blocked with a safe Spanish
configuration error while the draft remains saved.

### Supervisor requester

1. Submit the request to the shared administrator pool.
2. Keep the assigned approver empty until an administrator records a decision.
3. Exclude the requester from the administrator approval queue.

### Administrator requester

1. Submit the request to the shared administrator pool.
2. Keep the assigned approver empty until another administrator records a
   decision.
3. Exclude the requester from the administrator approval queue and enforce the
   same self-approval restriction in the transaction.

If no eligible approver exists, submission is blocked; draft creation and
editing remain available.

## Proposed persistence model

### `pto_balances`

One document per employee:

```ts
type PtoBalanceDocument = {
  _id: ObjectId;
  employeeId: ObjectId;
  openingBalanceUnits: number;
  currentBalanceUnits: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};
```

`employeeId` is unique. `version` supports conditional updates and concurrent
approval safety.

### `pto_balance_ledger`

Append-only movements:

```ts
type PtoBalanceLedgerDocument = {
  _id: ObjectId;
  employeeId: ObjectId;
  kind: "opening" | "adjustment" | "approved_request";
  deltaUnits: number;
  balanceBeforeUnits: number;
  balanceAfterUnits: number;
  requestId: ObjectId | null;
  reason: string | null;
  actorPlatformUserId: ObjectId;
  createdAt: Date;
};
```

Rules:

- Exactly one `opening` movement exists per employee.
- `adjustment` requires a normalized, non-empty administrator reason and a
  non-zero signed delta.
- `approved_request` references exactly one request and cannot be duplicated.
- Ledger records are never updated or deleted by normal application flows.
- Audit views return safe projections; they do not expose internal IDs to the
  browser unless required as opaque route identifiers.

### `pto_requests`

```ts
type PtoRequestStatus =
  | "draft"
  | "pending"
  | "approved"
  | "denied"
  | "cancelled";

type PtoStatusHistoryEntry = {
  from: PtoRequestStatus | null;
  to: PtoRequestStatus;
  actorPlatformUserId: ObjectId;
  occurredAt: Date;
};

type PtoRequestDocument = {
  _id: ObjectId;
  requesterEmployeeId: ObjectId;
  requesterPlatformUserId: ObjectId;
  // Legacy self-service requests may omit this; read models treat the
  // requester as creator in that case.
  createdByPlatformUserId?: ObjectId;
  startDate: string;
  endDate: string;
  durationUnits: number;
  category: "vacation" | "sick" | "personal" | "other";
  collaboratorNote: string | null;
  status: PtoRequestStatus;
  statusHistory: PtoStatusHistoryEntry[];
  assignedApproverPlatformUserId: ObjectId | null;
  decisionNote: string | null;
  balanceDeltaUnits: number | null;
  balanceBeforeUnits: number | null;
  balanceAfterUnits: number | null;
  submittedAt: Date | null;
  decidedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
```

The requester IDs, creator, status, approver, balance effects, and history are
server-owned fields. Client forms may submit only editable draft fields. For a
proxy request, `createdByPlatformUserId` identifies the administrator while
requester IDs remain those of the employee.

### `pto_audit`

Record searchable safe events:

```ts
type PtoAuditAction =
  | "request_created"
  | "request_updated"
  | "request_submitted"
  | "request_approved"
  | "request_denied"
  | "request_cancelled"
  | "request_approver_reassigned"
  | "balance_opened"
  | "balance_adjusted";
```

Each event records actor, request and/or employee target, changed field names,
and UTC timestamp. Audit records must not copy collaborator notes, decision
notes, reasons, employee names, email addresses, or balance values. The balance
ledger is authoritative for actual accounting values and required adjustment
reasons.

## Required indexes

At minimum:

```text
pto_balances
  unique { employeeId: 1 }

pto_balance_ledger
  { employeeId: 1, createdAt: -1 }
  unique partial { requestId: 1, kind: 1 }
    where kind = "approved_request"

pto_requests
  { requesterEmployeeId: 1, createdAt: -1 }
  { requesterEmployeeId: 1, status: 1, startDate: 1, endDate: 1 }
  { requesterPlatformUserId: 1, status: 1, endDate: 1, startDate: 1 }
  { assignedApproverPlatformUserId: 1, status: 1, submittedAt: 1 }
  { status: 1, submittedAt: 1, requesterPlatformUserId: 1 }
  { status: 1, updatedAt: -1 }
  { status: 1, startDate: 1, endDate: 1 }

pto_audit
  { targetRequestId: 1, createdAt: -1 }
  { targetEmployeeId: 1, createdAt: -1 }
  { actorPlatformUserId: 1, createdAt: -1 }

dashboard_notification_reads
  unique { platformUserId: 1, notificationKey: 1 }
```

The feature creates these indexes idempotently through `ensurePtoIndexes()`.
The dashboard read-state repository creates its own unique index idempotently.
All index creation is safe to rerun.

## Transaction and concurrency rules

### Employee creation

Creating an employee must insert the opening balance and opening ledger entry
inside the existing employee-creation transaction. If either insert fails, the
employee, assignment, schedule, access record, balance, ledger, and audit writes
must roll back together.

### Opening balance migration

Existing employees receive a manually entered opening balance. Creating it
must transactionally insert both the unique balance document and opening ledger
entry. A duplicate attempt returns a safe `El saldo inicial ya fue registrado`
outcome and never overwrites history.

An employee without an opening balance may save drafts but cannot submit. The
UI explains that an administrator must initialize the balance.

### Manual adjustment

An adjustment transaction must:

1. Validate administrator authorization, integer units, non-zero delta, and
   required reason.
2. Atomically advance the balance `version` and current units.
3. Insert one ledger movement with before/after values.
4. Insert a safe audit event.
5. Commit all changes together or none of them.

### Approval

Approval must run in one MongoDB transaction:

1. Re-read the request and conditionally require `pending` status.
2. Verify the actor is either the active snapshotted supervisor or an active
   administrator, and is not the requester.
3. Recompute the confirmed category balance effect.
4. If balance applies, lock or conditionally update the employee balance,
   allowing the result to be negative.
5. Insert the unique approved-request ledger movement.
6. Set request status, decision note, balance effect, before/after snapshots,
   decision timestamp, and status-history entry.
7. Insert the safe PTO audit event.
8. Commit together.

Concurrent or repeated approvals must produce one status transition and at
most one balance movement. Duplicate clicks return the current request state
without applying the duration twice.

Denial and cancellation are also conditional transactional transitions with
status history and audit, but they do not mutate the balance.

## Suggested routes and navigation

```text
/ausencias
/ausencias/nueva
/ausencias/[requestId]
/ausencias/[requestId]/editar
/admin/ausencias
/admin/colaboradores/[employeeId]/ausencias
/admin/colaboradores/[employeeId]/ausencias/nueva
```

`Ausencias` is in the base workspace navigation for every active role. The main
page provides role-aware sections:

- `Mis solicitudes` for all roles.
- `Por aprobar` for supervisors and administrators with assigned work.
- `Historial de decisiones` for approvers.

Administrators receive balance administration and the proxy-request entry point
from the employee detail route, not from a client-side-only privileged panel.

## Read models and privacy

Define purpose-built projections rather than returning complete request,
employee, assignment, or platform-user documents.

### Requester list projection

- Opaque request ID.
- Date range and formatted duration.
- Category label.
- Current status.
- Assigned approver display name after submission.
- Created, submitted, decided, or cancelled timestamp as applicable.
- No internal IDs.

### Approver queue projection

- Opaque request ID.
- Requester preferred display name with canonical fallback.
- Current department and position needed for context.
- Date range, duration, category, collaborator note, current balance, and
  projected balance.
- Overlap and insufficient-balance warnings.
- No personal email, phone, birthday, identification, Clerk ID, or unrelated
  employee fields.

### Administrator balance projection

- Employee display name and employment status.
- Opening and current balance.
- Ledger timeline with movement type, delta, before/after, reason when the
  administrator is authorized to view it, actor display name, and timestamp.
- No raw MongoDB or Clerk identifiers.

## Warning and confirmation experience

Submission must not turn warnings into validation errors.

1. The server preflight checks overlap and, once the category mapping is
   confirmed, projected balance.
2. If neither warning exists, submission proceeds normally.
3. If warnings exist, the page displays a Spanish warning summary and requires
   an explicit `Enviar de todos modos` confirmation.
4. Final submission re-runs the checks to avoid stale client decisions.
5. A negative projected balance never disables submission or approval.
6. Approvers see current warnings again before deciding.

Example messages:

- `Esta solicitud coincide con otra ausencia pendiente o aprobada.`
- `El saldo proyectado será de -1,5 días.`
- `Podés enviar la solicitud de todos modos.`

Warnings must never disclose another request's private note or decision note.

## Calendar and schedule integration

Extend `CalendarEntryKind` with `pto` and aggregate authorized approved
requests in `getCalendarEntries()`.

Recommended calendar projection:

```ts
type PtoCalendarEntry = CalendarEntry & {
  kind: "pto";
};
```

Rules:

- Only `approved` requests appear.
- Entries use the approved request's inclusive start/end business dates.
- The normalized calendar end timestamp follows the calendar's existing
  half-open UTC range convention.
- The entry is all-day because the request does not contain exact hours.
- The visible label is `Ausencia` and includes the formatted duration.
- The title uses the requester's preferred display name with canonical fallback.
- `description`, collaborator note, decision note, balance, and ledger data are
  never included.
- The category is not exposed in a shared calendar projection unless product
  explicitly approves that visibility; `Enfermedad` is potentially sensitive.
- Recommended visibility is requester, assigned approver, and administrators.
- A detail link is returned only when the viewer can read the underlying
  request.
- Approved entries are read-only from the calendar; decisions remain in
  `Solicitudes de ausencia`.

For an approved proxy request, the employee's own Inicio notification is a
separate, requester-only projection. It may show the category and links to the
request detail; it never changes the privacy of shared calendar entries.

The current project has employee work-pattern summaries but no shared schedule
route. Expose the same privacy-safe approved-absence query for a future schedule
consumer without creating an unused schedule UI in this delivery.

## Acceptance criteria

### 1. Authentication and server authorization

1. Every PTO page, Server Action, and server read authenticates through
   `requirePlatformUser()`.
2. Signed-out, deactivated, unlinked, and MFA-incomplete privileged users cannot
   obtain PTO data or mutate it.
3. A self-service requester is derived from the authenticated platform user.
   For an administrator proxy request, requester identity is derived server-side
   from the selected active employee record and its linked platform user.
4. Client-submitted platform-user requester, actor, status, balance, history,
   and snapshot fields are ignored or rejected.
5. Direct Server Action invocation enforces the same authorization as the UI.

### 2. Balance initialization

1. Employee creation requires an administrator-entered initial balance in
   `0.5`-day increments.
2. The creation review step shows the initial balance before final submission.
3. Employee, access, assignment, schedule, balance, opening ledger, and audit
   writes are transactionally consistent.
4. Existing employees can receive exactly one manually entered opening balance.
5. Opening balances may be zero or signed half-day values; no unrequested
   minimum or allowance maximum is inferred.
6. A missing opening balance is clearly distinguishable from a zero balance.

### 3. Balance adjustment

1. Only administrators can adjust a balance.
2. An adjustment requires a non-zero signed half-day amount and a trimmed,
   non-empty reason.
3. The confirmation displays employee, current balance, adjustment, and result.
4. Negative resulting balances are accepted.
5. The balance and ledger movement commit atomically.
6. Historical ledger movements cannot be edited or deleted.

### 4. Draft creation and editing

1. Any active linked employee can create a draft for themselves.
2. Required request fields validate on the server using Zod.
3. Duration accepts at least `0.5` day and only `0.5` increments.
4. Start date cannot be after end date.
5. A draft can be edited repeatedly without writing balance movements.
6. A requester cannot edit another person's draft. An administrator may manage
   an administrator-created proxy draft for the employee it targets.
7. Pending and terminal requests cannot be edited.
8. Unsaved changes use the existing guarded-form behavior.
9. An administrator can create, edit, submit, or cancel a draft on behalf of an
   employee; the employee remains the requester for balance, overlap, routing,
   calendars, and self-approval rules.
10. A proxy-created request stores the administrator as creator and displays a
    small attribution note with that administrator's name.
11. An active employee's app-account activation state does not block an
    administrator from recording a proxy request for that employee.

### 5. Submission and routing

1. Submitting a valid draft resolves an eligible approver according to the
   requester's current platform role.
2. Collaborator requests route only to their effective assigned supervisor.
3. Supervisor requests enter the shared administrator approval pool.
4. Administrator requests enter the same pool and are hidden from their own
   approval queue.
5. No requester can approve their own request.
6. Missing assignment and missing opening balance are configuration blockers
   with safe Spanish messages; the draft remains intact.
7. Successful submission snapshots the approver, records actor and timestamp,
   and changes exactly once to `pending`.

### 6. Warnings

1. Overlap with another pending or approved request produces a warning.
2. A projected negative balance produces a warning when the confirmed category
   has a balance effect.
3. Overlap and negative balance do not block submission or approval.
4. Warnings are recomputed on the server immediately before the final action.
5. Warning messages do not reveal private data from another request.

### 7. Approval

1. The active snapshotted supervisor or any active administrator may approve a
   pending request.
2. Administrators cannot approve their own requests.
3. Approval accepts an optional decision note.
4. The confirmed category rule determines whether a balance movement applies.
5. When applicable, approval records delta, before, and after on both the
   request snapshot and immutable ledger movement.
6. Insufficient balance and a negative result do not block approval.
7. Request transition, balance mutation, ledger movement, history, and audit
   commit in one transaction.
8. Repeated or concurrent approval cannot deduct twice.

### 8. Denial

1. The active snapshotted supervisor or any active administrator may deny a
   pending request, except their own.
2. Denial accepts an optional decision note.
3. Denial records actor, timestamp, status history, and audit.
4. Denial does not change the balance or create a balance ledger movement.

### 9. Cancellation

1. A requester can cancel only their own `draft` or `pending` request. An
   administrator may also cancel a proxy request created for an employee.
2. Cancellation records actor, timestamp, status history, and audit.
3. Cancellation does not change the balance.
4. Approved and denied requests cannot be cancelled or edited.
5. Cancelled requests remain visible in the requester's history and are never
   hard deleted.

### 10. Approver reassignment

1. Pending requests do not silently reroute after reporting-line or role
   changes.
2. An administrator can reassign only when the current approver is inactive or
   otherwise ineligible.
3. The replacement must satisfy the requester's role routing rule and cannot be
   the requester.
4. Reassignment records previous/new field names in safe audit metadata and a
   timestamped audit event without rewriting past events.

### 11. Lists and detail

1. `Mis solicitudes` shows drafts and complete status history newest first.
2. `Por aprobar` shows assigned pending requests for supervisors and all
   pending requests except the viewer's own for administrators.
3. The administrator management view lists organization-wide non-draft
   requests, supports status filtering, prioritizes pending work, and never
   exposes private drafts.
4. Detail returns collaborator and decision notes only to the requester,
   assigned approver, and administrators.
5. Empty states distinguish no personal requests from no pending approvals.
6. Status uses Spanish text and never relies on color alone.
7. Internal IDs and unrelated employee data are absent from client projections.

### 12. Calendar privacy

1. Only approved requests appear in authorized calendar queries.
2. Draft, pending, denied, and cancelled requests never appear.
3. Calendar entries never expose collaborator notes, decision notes, balances,
   audit history, or sensitive category details.
4. A `0.5`-day entry visibly states its duration but does not invent a morning
   or afternoon time.
5. Calendar authorization runs on the server and does not rely on hiding an
   entry in a Client Component.
6. A proxy-created request may show its category in the employee's own Inicio
   notification, but that does not widen the shared-calendar projection.

### 13. Dashboard notification state

1. Only an upcoming approved PTO request created by an administrator on behalf
   of the employee enters that employee's dashboard notification feed.
2. The employee can read the PTO detail through the notification; the server
   validates that the submitted notification key is still in that employee's
   current feed before marking it read and redirecting.
3. Read markers are unique per platform user and notification key. Marking a
   notification read never changes PTO business data.
4. The workspace navigation renders the same unread count in desktop and mobile
   navigation.

### 14. Auditability

1. Every create, edit, submit, approve, deny, cancel, approver reassignment,
   opening balance, and adjustment records actor and UTC timestamp.
2. Request status history is append-only.
3. Balance ledger history is append-only.
4. Audit writes are in the same transaction as their business mutation.
5. Audit metadata contains field names, not private text or identification data.

### 15. Responsive and accessible behavior

1. All requester, approver, and balance-admin flows work at 320 CSS pixels and
   200% zoom without root-level horizontal scrolling.
2. Forms use native labels, connected error descriptions, accessible warning
   summaries, and visible focus.
3. Status and warning meaning does not depend on color.
4. Pending actions disable duplicate submission and announce specific Spanish
   progress text.
5. Desktop tables become semantic compact lists when they are no longer
   understandable on mobile.
6. Light and dark themes meet WCAG 2.2 AA contrast expectations.

### 16. Quality and failure behavior

1. Expected validation and stale-state conflicts return safe Spanish outcomes
   without exposing database details.
2. Transaction failures leave no partial balance, ledger, request, or audit
   writes.
3. Revalidation updates request lists, approver queues, employee detail,
   profile balance, calendar pages, and the workspace notification badge after
   relevant mutations.
4. Formatting, linting, CSS validation, TypeScript, tests, and production build
   pass.

## Key scenarios

### Collaborator submits despite negative projected balance

```text
Given Ana is an active collaborator with 1 day available
And Ana has an assigned active supervisor
When Ana requests 2 days in a balance-consuming category
Then the interface warns that the projected balance is -1 day
And Ana can choose "Enviar de todos modos"
And the request becomes pending for her assigned supervisor
And her current balance remains 1 day until approval
```

### Assigned supervisor approves once

```text
Given Ana's 2-day request is pending
And Luis is its assigned approver
When Luis approves it twice concurrently
Then exactly one transition to approved is stored
And exactly one -2 day ledger movement is stored when balance applies
And the request snapshots the balance before and after
And the resulting negative balance is accepted
```

### Self-approval is rejected

```text
Given an administrator submits their own request
When they attempt to assign or invoke approval as themselves
Then the server rejects the operation
And no status, balance, ledger, or audit mutation is committed
```

### Private notes stay out of the calendar

```text
Given an approved request contains collaborator and decision notes
When an authorized viewer loads the calendar month
Then the approved absence appears
And neither note nor the balance snapshot is present in the calendar payload
```

### Administrator-created request notifies the employee

```text
Given an administrator creates and approves a future absence for an employee
When the employee loads Inicio
Then the employee sees an unread "Ausencia aprobada" notification
And it links to that request detail
And opening it marks only that employee's notification read
And the employee's balance, routing, and calendar ownership remain unchanged
```

## Suggested feature structure

```text
web/src/
├── app/(workspace)/
│   ├── ausencias/
│   │   ├── [requestId]/editar/page.tsx
│   │   ├── [requestId]/page.tsx
│   │   ├── nueva/page.tsx
│   │   └── page.tsx
│   └── admin/
│       ├── ausencias/page.tsx
│       └── colaboradores/[employeeId]/ausencias/
│           ├── nueva/page.tsx
│           └── page.tsx
└── features/pto/
    ├── actions/pto-actions.ts
    ├── components/
    │   ├── pto-balance-forms.tsx
    │   ├── pto-request-form.tsx
    │   └── pto-transition-forms.tsx
    ├── domain/pto.ts
    └── server/
        ├── pto-indexes.ts
        ├── pto-repository.ts
        └── pto-service.ts
```

Keep one component per file. Pages should remain Server Components unless an
interaction requires client state. Server Actions call `pto-service.ts`; Client
Components never import repositories.

## Implementation status and remaining roadmap

The domain, balances, drafts, routing, approval actions, calendar aggregation,
administrator proxy requests, and dashboard notification/read-state behavior
are implemented. The slices below remain a historical delivery map and a guide
for regression coverage; they are not pending MVP work unless explicitly noted.

### Slice 1: Domain foundation and indexes

- Define units, categories, statuses, transition matrix, input schemas, and
  safe Spanish domain errors.
- Add balances, ledger, requests, audit collections, and indexes.
- Confirm idempotent runtime index creation remains healthy in each deployment
  environment.
- Unit test all half-day conversion and state transitions.

### Slice 2: Opening balances and adjustments

- Add initial balance to employee creation and its review step.
- Add manual opening-balance migration UI for existing employees.
- Add administrator balance card, adjustment confirmation, and ledger view.
- Test transaction rollback, duplicate opening, negative balances, and
  concurrent adjustments.

### Slice 3: Requester drafts and submission

- Add navigation and requester list/detail pages.
- Add create/edit draft, server preflight warnings, cancellation, and guarded
  forms.
- Implement role-based approver resolution and snapshotting.
- Test missing assignments, self-approval, overlaps, and warning confirmation.

### Slice 4: Approver queue and decisions

- Add assigned approval queue and detail projection.
- Implement transactional approve/deny and optional decision note.
- Implement orphaned-approver reassignment.
- Test scope, concurrency, idempotency, negative balances, and audit history.

### Slice 5: Calendar aggregation

- Add `pto` to `CalendarEntryKind`.
- Aggregate only authorized approved requests.
- Add absence styling and Spanish labels without exposing private notes or
  sensitive category details.
- Test date ranges, half-days, visibility, and payload privacy.

### Slice 6: Responsive journey and operational hardening

- Add route loading/error/empty states and feedback messages.
- Verify requester, approver, and administrator journeys at mobile, tablet, and
  desktop sizes in both themes.
- Add recovery documentation, migration instructions, and complete end-to-end
  coverage.

## Required tests

### Unit

- Decimal input to integer units and back, including negatives.
- Minimum and multiple-of-half-day validation.
- Date-range validation and overlap detection.
- Every allowed and rejected status transition.
- Category labels and the product-approved balance-effect mapping.
- Role-based approver resolution and self-approval rejection.
- Privacy-safe request and calendar projections.
- Administrator-created employee requests preserve the employee requester and
  creator attribution.
- Dashboard notification aggregation, unread state, and trusted read redirect.

### Repository and integration

- Unique opening balance and opening ledger creation.
- Atomic adjustment with required reason.
- Employee creation rollback including PTO balance.
- Approval rollback across request, balance, ledger, history, and audit.
- Two concurrent approvals produce one balance effect.
- Two concurrent adjustments preserve a linear before/after ledger.
- Conditional stale-status rejection.
- Pending-request approver reassignment audit.

### Authorization

- Each role reading own requests.
- Supervisor assigned queues and the shared administrator queue.
- Unassigned pool-request approval by an administrator.
- Administrator approval override with self-approval denial.
- Direct mutation attempts against another request.
- Deactivated users and approvers.
- Administrator proxy-draft create, edit, submit, and cancel authorization.

### Component

- Draft Save/Cancel and dirty-state confirmation.
- Warning confirmation without turning warnings into blockers.
- Pending labels and duplicate-submit prevention.
- Approve/Deny confirmation and optional note.
- Balance adjustment confirmation and reason validation.
- Empty, loading, validation, stale-state, and transaction-error feedback.

### End to end

- Administrator creates employee with opening balance.
- Existing employee receives an opening balance and adjustment.
- Collaborator draft → warning → pending → supervisor approval.
- Supervisor request → shared administrator pool approval.
- Administrator request → another administrator in the shared pool approval.
- Draft and pending cancellation.
- Denial without balance effect.
- Approved absence appears only on authorized calendars.
- Administrator-created approved absence appears in the employee's Inicio feed
  and can be marked read.
- Mobile and 200%-zoom flows have no root horizontal scrolling.
- Automated accessibility checks pass in light and dark themes.

## Non-goals

- Automatic accrual.
- Tenure-based, role-based, department-based, or category-based allowances.
- Carryover, expiration, reset dates, or annual balance periods.
- Separate automatic balances per category.
- Holiday calendars or automatic business-day calculations.
- Automatic deduction of weekends or non-working schedule days.
- Morning/afternoon allocation for half-day requests.
- Attachments or medical documentation.
- Delegated or temporary approvers beyond audited orphan recovery.
- Email, push, Slack, or other delivery channels. The implemented in-app Inicio
  notification/read-state experience remains in scope.
- Bulk approval or bulk balance adjustments.
- Payroll or external HRIS synchronization.
- Editing, cancelling, or reversing an approved request.
- Hard deletion of requests, ledger movements, or audit events.

## Definition of done

This story is complete when:

1. The generic balance mapping (all four categories consume balance) and the
   requester/approver/administrator calendar audience are documented and
   covered by tests.
2. Every existing employee has exactly one opening balance ledger record.
3. New employee creation includes an opening balance transactionally.
4. All workflow transitions, role routing rules, warnings, and negative-balance
   behavior satisfy the acceptance criteria.
5. Approval and adjustments are concurrency-safe and fully auditable.
6. Approved absences appear through a privacy-safe authorized calendar source.
7. No private note or sensitive employee field is exposed through list or
   calendar projections.
8. The complete workflow, including proxy-request attribution and dashboard
   read state, passes proportionate unit, authorization, component, responsive,
   and production-build verification.
