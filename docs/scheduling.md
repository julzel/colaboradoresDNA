# Collaborator scheduling

## Purpose and scope

The Scheduling slice is the canonical application boundary for collaborator
work schedules. It lives under `web/src/features/scheduling/` and owns v2
validation, effective-dated persistence, schedule resolution, and neutral work
range calculations. Legacy v1 records remain readable, but new collaborator
creation no longer creates or edits schedules outside this slice.

The administrator scheduler is available at `/admin/horarios`. It provides a
date-aware, searchable roster with weekly and alternating schedule previews.
`/admin/horarios/[employeeId]` provides the v2 schedule detail/editor, effective
date management, exact shift inputs, alternating-week setup, and history.
`/perfil/horario` provides the collaborator-facing, read-only schedule view. It
derives the employee from the authenticated account, never accepts an arbitrary
employee identifier, and identifies the active week in an alternating cycle.
The collaborator administration detail does not duplicate schedule controls;
administrative schedule viewing and changes live exclusively under
`/admin/horarios`. When a collaborator has never had a schedule configured, the
detail page shows a setup reminder that links to the canonical scheduler editor.

The editor presents each week as a horizontally scrollable grid of 30-minute
blocks from `07:00` through `17:00`, with a sticky weekday column.
Administrators can enable or disable a day directly. A first click or tap
toggles a single block. Regular clicks on an adjacent block extend the
consecutive interval, while clicks on a selected edge remove that block.
Shift-clicking another block fills the whole interval from the previous
selection at once. Week A and Week B use independent grids, and Week A can be
copied into Week B before making exceptions.

Grid edits produce one consecutive start/end interval per working day, matching
the domain invariant. Existing v2 times that do not fall on a half-hour remain
unchanged unless the administrator selects a new range in that row; the day
label continues to display the exact stored interval.

Pages and components consume Scheduling services through feature-owned query
and view-model contracts. A UI redesign therefore does not require changes to
the MongoDB representation or schedule calculations.

## Slice boundaries

```text
features/scheduling/
├── components/    Scheduler presentation and responsive roster UI
├── domain/        Pure schemas, types, cycle resolution, and range calculation
├── integrations/ Feature ports and provider adapters
├── server/        Authorized services, queries, repositories, and indexes
└── view-models/   Serializable, presentation-ready schedule projections
```

The authorized service returns serializable domain records. The scheduler query
service maps those records into presentation-ready view models without exposing
MongoDB documents to components.

Scheduling owns the canonical model and database setup for the
`employee_schedules` collection. Employee identity and audit behavior remain
owned by the Employees slice and are reached through an explicit
Scheduling-owned integration port. Other features must not import the Scheduling
repository or MongoDB document types directly.

An internal TypeScript service is the application API for first-party callers.
Do not add an internal HTTP Route Handler for a Server Component, Server Action,
or another feature to call.

## Canonical v2 schedule

Version 2 stores exact local clock times and supports either a weekly or an
alternating two-week cycle.

```ts
type ScheduleV2 = {
  version: 2;
  id: string;
  employeeId: string;
  timezone: "America/Costa_Rica";
  effectiveFrom: string;
  effectiveTo: string | null;
  anchorDate: string;
  weeks: [ScheduleWeek] | [ScheduleWeek, ScheduleWeek];
};

type ScheduleWeek = {
  shifts: ScheduleShift[];
};

type ScheduleShift = {
  dayOfWeek:
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday";
  startTime: string;
  endTime: string;
};
```

Business dates use `YYYY-MM-DD`. Shift times use zero-padded, 24-hour `HH:mm`
wall-clock values with minute precision. They do not include a date, UTC offset,
or `Z` suffix because the pattern is evaluated in `America/Costa_Rica`.

The following invariants apply:

- `weeks` contains exactly one or two week patterns.
- The first pattern is Week A; the second, when present, is Week B.
- A week contains only its working days. An omitted weekday is non-working.
- A weekday can appear no more than once in a cycle week.
- Every shift is one consecutive, same-day interval and requires
  `endTime > startTime`.
- Split shifts, overnight shifts, implicit meal deductions, and overtime policy
  are not represented.
- At least one working shift must exist across the complete stored cycle. An
  individual week may be empty when that is the intended alternating pattern.
- `effectiveTo`, when present, is on or after `effectiveFrom`.

For example, `07:30` through `16:30` is retained as an exact nine-hour scheduled
span. Scheduling does not infer whether that span contains an unpaid break.

### Alternating-week anchor

`anchorDate` must be a Monday. It establishes the Monday that begins Week A and
makes the A/B sequence deterministic independently of when a record is created
or displayed.

For a two-week schedule, the cycle week is calculated from the signed number of
whole weeks between `anchorDate` and the date being resolved, using positive
modulo two. This keeps the sequence correct for dates before the anchor and
across month and year boundaries. A one-week schedule always resolves to its
only week.

Changing an anchor changes the meaning of every A/B date in that effective
record. It is therefore part of the audited schedule command, not presentation
state or a label that the UI may choose locally.

## Effective-dated history

Schedule effective periods are inclusive. For a date to be covered:

```text
effectiveFrom <= date
effectiveTo is null or effectiveTo >= date
```

Only one schedule may cover an employee on a given date. Normal changes close
the applicable open record on the day before the new `effectiveFrom` and insert
a new v2 record. They do not overwrite or delete history. Future-dated records
are supported.

Per-employee timeline lock documents serialize schedule changes. The lock,
overlap check, historical close, new insert, and content-free audit event run in
one MongoDB transaction. The unique partial index allowing only one open period
is a final storage invariant; it does not replace the transactional overlap
check for closed or future periods.

Employment termination reaches Scheduling through an Employees-owned lifecycle
port. Scheduling truncates every period that starts by, but extends past, the
employment end date under the same per-employee lock and transaction. A planned
period beginning after termination is retained as historical data; the inactive
employee cannot use it through self-service or PTO, and canonical writes require
an active employee. A future rehire workflow must define whether such planned
records are reactivated or explicitly voided.

Employee onboarding still writes the v1 shape through its compatibility
repository. The `/admin/horarios` dashboard reads both versions, while the
detail/editor writes canonical v2 records and asks administrators for exact
hours before migrating a legacy schedule. The old employee schedule-edit URL
redirects to the canonical scheduler editor.

## Authorized service boundaries

Every public scheduling use case is server-only and authorizes independently.

### Administrator operations

An administrator may:

- read the effective schedule or history for any collaborator;
- create the initial schedule for a collaborator;
- replace a schedule from a requested effective date;
- calculate a collaborator's scheduled work over a date range.

The service derives the actor from `requirePlatformUser({ roles:
["administrator"] })`. A form or API client never supplies the authoritative
actor identifier.

### Collaborator operation

A collaborator may read only their own schedule. The service derives the
employee from the authenticated platform user and does not accept an arbitrary
target employee ID. Collaborators cannot create, replace, close, or correct a
schedule.

Hiding an edit control is not authorization. Future pages and Server Actions
must call these authorized service boundaries even if their route or navigation
is already restricted.

### Service API used by the scheduler UI

`web/src/features/scheduling/server/scheduler-service.ts` exposes:

- `createEmployeeScheduleAsAdministrator` for an initial bounded or open v2
  period;
- `replaceEmployeeScheduleAsAdministrator` to close the open period on the day
  before a new one begins and preserve history;
- `getEmployeeScheduleAsAdministrator` and
  `getEmployeeScheduleHistoryAsAdministrator` for one collaborator;
- `listEmployeeSchedulesAsAdministrator` for the organization-wide scheduler
  view on a selected date;
- `getSchedulerRosterAsAdministrator` for the UI-ready active collaborator list,
  including people whose schedule is missing;
- `resolveEmployeeWorkRangeAsAdministrator` for authorized diagnostics or
  previews;
- `getOwnEmployeeSchedule`, whose target comes only from the authenticated
  account;
- `resolveEmployeeWorkRange`, an authorization-free server-internal provider API
  that is not exposed as an HTTP endpoint and is consumed only through narrow
  feature ports.

These functions accept and return domain commands/records rather than MongoDB
documents. `/admin/horarios` calls the roster service through
`scheduler-query-service.ts`, which selects the effective date and builds the
UI view model. A future Server Action, REST handler, or different visual
scheduler can adapt the same service contract without moving schedule policy
into the interface.

## Neutral range calculation

Scheduling calculates work facts without importing PTO policy. A range request
contains an employee ID plus inclusive `startDate` and `endDate`. The repository
loads all schedule records that can intersect the range with the equivalent of:

```text
effectiveFrom <= endDate
effectiveTo is null or effectiveTo >= startDate
```

The pure calculation then resolves every calendar date against exactly one
effective schedule and returns a serializable result containing:

- a per-date breakdown;
- the working dates;
- the cycle-week index for each date;
- known start and end times when available;
- scheduled minutes per date and in total;
- the source schedule version and source schedule IDs.

Non-working dates still require effective schedule coverage. No matching record
is a coverage gap; multiple matching records are overlapping coverage. Both
conditions fail closed instead of silently treating the date as a day off.
Range calculations are capped at 3,660 inclusive calendar days so an internal
caller cannot accidentally materialize an unbounded result.

National holidays are intentionally outside the neutral calculation. Scheduling
does not import the Calendar holiday adapter and does not silently remove a date
because it appears in the national-holiday feed.

## PTO integration and leave-day policy

PTO owns the narrow consumer interface under its `integrations/` directory.
Scheduling provides the adapter that translates a neutral range calculation to
that interface. This follows the project rule that the consuming feature owns
the port while the providing feature owns its adapter.
The adapter does not assign the leave-policy version; PTO stamps that version
beside the conversion rule it owns.

For the current full-day leave workflow:

- every scheduled working date in the inclusive request range counts as one
  full leave day, regardless of whether its shift is five, eight, or nine hours;
- one full leave day remains two PTO balance units;
- total scheduled minutes and source schedule IDs are retained in the
  calculation result for traceability and future policy changes;
- scheduled minutes are not divided by eight to create fractional leave days;
- national holidays are not implicitly excluded;
- a schedule coverage gap or overlap prevents the calculation and therefore
  fails the leave operation safely.

The existing half-day request remains supported through an explicit PTO command
intent: when resolution finds one scheduled work date, PTO retains one balance
unit. Exact hour-based partial leave, category-specific calendar-day policies, break
deductions, and holiday exclusion require explicit future product rules. They
must not be inferred inside Scheduling.

The server calculates duration while a request is editable and freezes a
calculation snapshot when it is submitted. The snapshot includes the policy
version and enough source information to explain the stored result. Later
schedule edits or historical corrections do not silently change a submitted,
approved, denied, or cancelled request. Approval and balance updates use the
frozen request duration.

## Legacy v1 compatibility

Existing unversioned `employee_schedules` documents are legacy v1 records. They
store seven weekday entries using `workFraction` values of `0`, `0.5`, or `1`
and an optional `morning` or `afternoon` label. They contain no exact start or
end time.

The repository uses an explicit dual reader:

- missing `version` is normalized to `version: 1`;
- `version: 1` continues to resolve working and non-working dates;
- `version: 2` uses exact shifts and one- or two-week cycle resolution;
- writes through the new Scheduling administrator service use v2;
- employee onboarding remains on its isolated v1 compatibility path;
- `/admin/horarios` safely reads both legacy and v2 schedules through the
  canonical roster boundary;
- `/admin/horarios/[employeeId]` replaces or creates an effective v2 record and
  preserves earlier schedule periods.

A legacy full day retains its historical nominal eight hours and a half day its
nominal four hours for compatibility calculations. Its clock time remains
unknown: range results identify that fact and return no fabricated `startTime`
or `endTime`.

Bootstrap and migration operations must not manufacture exact shifts for v1
documents. `workFraction: 1` cannot reveal whether a person worked 07:30–15:30,
08:00–16:00, or another interval. Converting a legacy record to v2 therefore
requires an administrator-approved replacement with actual times and an
effective date. V1 support can be removed only after every legacy timeline has
been reviewed and replaced.

## MongoDB bootstrap

Run the idempotent scheduling bootstrap with migration-capable credentials:

```bash
cd web
pnpm bootstrap:scheduling-model
```

It reconciles the reviewed `employee_schedules` timeline and one-open-period
indexes and installs a moderate dual-read collection validator for v1 and v2.
It does not create collaborators, create schedules, rewrite v1 records, or infer
clock times. Before changing an index, it fails safely if it finds duplicate open
periods, overlapping timeline records, or an invalid existing v2 schedule; those
records require an explicit reviewed correction.

Index creation is a deployment/bootstrap responsibility. Runtime Scheduling
repositories do not call `createIndex`, so those paths do not require
schema-administration privileges.

## Failure and audit behavior

Expected domain failures include an invalid date range, a missing employee,
overlapping effective periods, a range coverage gap, and overlapping coverage.
Services translate them into safe outcomes without returning MongoDB details or
internal lock identifiers.

Schedule audit records contain the actor, target employee, action, changed field
names, and timestamp. They do not copy a complete schedule payload. Mutation and
audit insertion share the same transaction.

## Test coverage

The slice is expected to retain focused tests for:

- exact minute-level shifts and all three representative schedule patterns;
- validation and canonical weekday ordering;
- Week A/B parity before and after the Monday anchor and across year boundaries;
- inclusive ranges, non-working dates, and ranges spanning effective records;
- coverage gaps, overlapping coverage, and invalid ranges;
- legacy v1 dual reads without fabricated clock times;
- transactional replacement, timeline locking, overlap rejection, and audit;
- administrator-only writes and identity-bound collaborator reads;
- PTO port/adapter isolation, one-day-per-scheduled-date conversion, retained
  minute totals, fail-closed gaps, and frozen submitted snapshots;
- migration/bootstrap index contracts and the absence of runtime index creation.
