# MVP implementation audit

## Audit status

**Audit date:** 2026-08-04  
**Audited branch:** `mvp/audit-roadmap`  
**Audited commit:** `e0b0730`  
**Primary acceptance source:** [`tasks/done/platform-description.md`](done/platform-description.md)  
**Assessment type:** Static implementation review plus local automated checks.

This document compares the current repository with the 15 launch acceptance
criteria in the platform description. It is intended to guide the next work in
small, coherent increments. It is not a production certification: authenticated
journeys against the deployed Clerk and MongoDB environments still require
manual and automated end-to-end validation.

## Status legend

| Status          | Meaning                                                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Met in code** | The current implementation contains the expected user flow and server enforcement. Remaining general release validation is tracked separately. |
| **Partial**     | Meaningful implementation exists, but a required capability, invariant, test, or operational proof is missing.                                 |
| **Not met**     | A central part of the criterion is absent from the current product experience.                                                                 |

## Executive summary

The project is well beyond a prototype. Authentication boundaries, employee
records, self-service profiles, PTO transactions, calendar audiences, audit
writes, responsive components, PWA installation, and Netlify packaging all have
real implementations. The local optimized Next.js build succeeds, 128 unit and
component tests pass, and the three current Playwright checks pass.

The MVP is **not launch-ready yet**. The main gaps are not in the PTO state
machine itself; they are in the role-aware operational experience and release
proof around it:

- The home page is a notification feed, not the dashboard required for each
  role. It omits the user's PTO balance, recent requests, upcoming absences, and
  supervisor/administrator summaries.
- Supervisors have no discoverable approval inbox after the review section was
  removed. The server can still return and decide assigned requests, but the
  normal UI does not expose that work.
- Departments can be selected and assigned, but there is no administrator UI
  to create, edit, activate, or deactivate them.
- The seed/bootstrap path does not reproduce the full organization, and there
  is a specific gap between bootstrapped administrator accounts and employee
  profiles.
- Audit writes exist across four feature-owned collections, but activation and
  department lifecycle events are incomplete and administrators cannot browse
  a unified audit trail.
- Critical authenticated workflows do not have browser-level coverage. The
  current Playwright suite covers only signed-out routing, theme persistence,
  and accessibility of the public sign-in surface.
- Production deployment documentation exists, but the checked-in guard and
  documentation intentionally describe a development-only Netlify site using
  Clerk test keys and a non-production database.
- The documented `pnpm verify` gate is currently red because one calendar
  component fails Prettier validation.

Current acceptance assessment:

| Result      | Count |
| ----------- | ----: |
| Met in code |     4 |
| Partial     |    10 |
| Not met     |     1 |

The strongest implemented acceptance areas are half-day/negative-balance PTO,
approval routing and self-approval prevention, calendar audience enforcement,
and privacy-safe approved-PTO calendar entries. The weakest area is the
role-aware dashboard and supervisor operating flow.

## Verification performed

The following commands were run from `web/` during this audit:

| Check               | Result     | Notes                                                                                                                                                    |
| ------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm format:check` | **Failed** | [`calendar-create-event-trigger.tsx`](../web/src/features/calendar/components/calendar-create-event-trigger.tsx) is not formatted according to Prettier. |
| `pnpm lint`         | Passed     | ESLint completed without errors.                                                                                                                         |
| `pnpm stylelint`    | Passed     | Project CSS completed without errors.                                                                                                                    |
| `pnpm typecheck`    | Passed     | TypeScript completed with `--noEmit`.                                                                                                                    |
| `pnpm test`         | Passed     | 21 test files and 128 tests passed.                                                                                                                      |
| `pnpm build`        | Passed     | Next.js 16 optimized build completed and emitted all application routes.                                                                                 |
| `pnpm test:e2e`     | Passed     | Three Chromium tests passed. The suite does not authenticate a user or exercise MongoDB-backed workflows.                                                |
| `pnpm verify`       | **Failed** | It stops at `format:check`, before the otherwise-passing checks run.                                                                                     |

The working tree was clean before the report was created. Generated changes to
`next-env.d.ts` from the production build were reverted after validation.

## Acceptance-criteria scorecard

|   # | Acceptance criterion                                                                                        | Status          | Summary                                                                                                                                                                                                                                                            |
| --: | ----------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|   1 | All rendered product and authentication text is in Spanish.                                                 | **Partial**     | The application uses `lang="es-CR"`, Clerk `esCR`, Spanish pages, messages, metadata, emails, and formatters. There is no comprehensive rendered-copy audit, and terminology differs between specifications and screens.                                           |
|   2 | An invited active user can authenticate, use MFA when required, and sign out.                               | **Partial**     | Invitation claiming, role-based MFA enforcement, Clerk account/session controls, and sign-out are implemented. The deployed invitation, Google, email-code, MFA, recovery, and sign-out journeys have not been proven by authenticated E2E tests in this audit.    |
|   3 | Deactivated, unauthenticated, and unauthorized users are rejected by direct URLs and server mutations.      | **Partial**     | `requirePlatformUser()` enforces active status, role, Clerk identity, and privileged-role MFA on the server. Policy tests exist, but there is no database-backed/direct-URL mutation test matrix for all roles.                                                    |
|   4 | An administrator can manage users, roles, teams, reporting lines, account status, and PTO opening balances. | **Partial**     | Users, roles, assignments, managers, schedules, access status, invitations, and PTO balances are implemented. Department/team lifecycle has no UI, and the final-active-administrator rule is not enforced.                                                        |
|   5 | The current organization can be created through a repeatable seed or administration interface.              | **Partial**     | Department and administrator bootstraps are idempotent, and employees can be created from the UI. There is no complete organization seed/import, and bootstrapped admins cannot be cleanly linked to employee records through the existing employee-creation flow. |
|   6 | Every role sees correct navigation, dashboard content, and private data.                                    | **Not met**     | Navigation and private-data boundaries are partly role-aware, but Inicio is the same notification-only page for all roles and omits required PTO/team/organization summaries. Supervisor operating views are absent.                                               |
|   7 | A collaborator can request a half-day absence and submit one with a negative projected balance.             | **Met in code** | Integer half-day units, `0.5` validation, non-blocking warnings, and negative balances are implemented. A dedicated authenticated journey should still be added to release tests.                                                                                  |
|   8 | Requests route to the correct approver and cannot be self-approved.                                         | **Met in code** | Collaborators resolve an active assigned supervisor/admin; supervisors/admins enter the active-admin pool; transactional decision code rejects self-approval.                                                                                                      |
|   9 | Authorized approvers can approve or deny, and the requester can see history.                                | **Partial**     | Decision actions and status history exist, and administrators have a management page. Supervisors have no discoverable list of assigned requests in the current UI.                                                                                                |
|  10 | An authorized user can create an event, and only the intended audience can view it.                         | **Met in code** | Administrator/supervisor creation and management, company/department/invitee visibility, target validation, and server-side audience filters are present.                                                                                                          |
|  11 | Approved PTO appears on authorized schedules without private notes.                                         | **Met in code** | Calendar aggregation includes approved PTO using a purpose-built projection with dates, duration, and display name only. Collaborator and decision notes are not returned to the calendar summary.                                                                 |
|  12 | Sensitive user, permission, balance, PTO, event, and bootstrap changes create safe audit entries.           | **Partial**     | Auth, employee, PTO, calendar, and bootstrap audit repositories exist and avoid copying secret values. Invitation activation and department lifecycle auditing are incomplete, and there is no admin audit browser.                                                |
|  13 | Critical auth, authorization, organization, PTO, calendar, and dashboard journeys have automated coverage.  | **Partial**     | Domain and component coverage is useful, but browser coverage is only three public-shell checks. There are no authenticated role journeys or real repository/transaction integration tests.                                                                        |
|  14 | Critical workflows meet WCAG 2.2 AA and work on supported mobile and desktop layouts.                       | **Partial**     | Accessible primitives, focus handling, Spanish validation, responsive CSS, and an Axe check exist. Only the public sign-in surface is scanned, Chromium desktop is the only Playwright project, and core authenticated mobile workflows are not covered.           |
|  15 | The production build deploys to Netlify with documented environment configuration.                          | **Partial**     | The optimized build and Netlify Next.js packaging pass, and deployment docs are detailed. The current site is explicitly development-only, live credentials are rejected, production operational checks are pending, and `pnpm verify` is red.                     |

## Detailed findings

### 1. Spanish product and authentication experience — Partial

Implemented evidence:

- [`src/app/layout.tsx`](../web/src/app/layout.tsx) sets `lang="es-CR"`, uses
  Clerk's `esCR` localization, and supplies Spanish metadata.
- [`config/clerk/`](../web/config/clerk) contains restricted instance settings
  and six Spanish authentication/security email templates.
- Calendar and PTO date formatting use `es-CR`; calendar date/time conversion
  centralizes `America/Costa_Rica` behavior.
- Shared loading, error, feedback, modal, and form components provide Spanish
  accessible names and messages.

Gaps and risks:

- There is no automated crawl/assertion that rendered text and accessible names
  are Spanish across every route and state.
- The platform description maps `denied` to **Rechazada**, while
  [`pto.ts`](../web/src/features/pto/domain/pto.ts) and the PTO user story use
  **Denegada**. The area is formally named `Solicitudes de ausencia`, while the
  base navigation currently says `Ausencias`.
- Provider-hosted recovery, verification, invitation, and MFA states depend on
  the Clerk instance configuration, not only the repository files. They require
  deployed validation.

Recommended completion:

1. Choose one approved label for `denied` and one rule for long/short area
   names, then update the source specifications and centralized labels.
2. Add a rendered-copy smoke suite for public, collaborator, supervisor, and
   administrator pages, including errors, empty states, and Clerk surfaces.
3. Run the Clerk email/template and account-flow checklist against the intended
   production instance.

### 2. Invitation, MFA, and sign-out — Partial

Implemented evidence:

- [`require-platform-user.ts`](../web/src/features/auth/server/require-platform-user.ts)
  resolves a Clerk session to the authoritative MongoDB platform user.
- [`access-policy.ts`](../web/src/features/auth/lib/access-policy.ts) denies
  missing, invited, and deactivated users and requires MFA for administrators
  and supervisors.
- Invitation creation/resend and verified-email claiming are implemented in
  the auth repositories and actions.
- `/account/security` exposes Clerk security and active-session controls, and
  Clerk's user button supplies sign-out.
- [`auth-access-policy.test.ts`](../web/tests/unit/auth-access-policy.test.ts)
  covers role-based MFA and access status at the policy layer.

Gaps and risks:

- No authenticated Playwright test accepts an invitation, enrolls MFA, signs
  out, or revokes a session.
- The repository records the desired Clerk state, but actual development or
  production provider state can drift.
- The true production Clerk instance, production Google OAuth domains, and
  production email templates are explicitly still pending in
  [`docs/authentication.md`](../docs/authentication.md).

Recommended completion:

1. Create deterministic E2E test identities for collaborator, supervisor, and
   administrator roles in an isolated test environment.
2. Automate email-code/invitation acceptance where practical and retain a
   documented manual checklist for Google OAuth and account recovery.
3. Add a deployment smoke test for sign-in, MFA gate, sign-out, and revoked
   sessions.

### 3. Server-enforced rejection — Partial

Implemented evidence:

- Protected layouts, pages, services, and Server Actions call
  `requirePlatformUser()` and role-restricted operations pass explicit role
  lists.
- Employee sensitive reads, profile ownership, calendar management, PTO
  decisions, and administrator account actions all resolve the actor on the
  server.
- Deactivation fails closed in MongoDB before the Clerk ban attempt, so a Clerk
  outage does not restore application access.

Gaps and risks:

- Tests mostly mock the authorization boundary rather than exercising direct
  URLs and real Server Actions as each role.
- There is no consolidated permission matrix test that proves every protected
  route and mutation for unauthenticated, deactivated, collaborator,
  supervisor, and administrator actors.
- The generic [`proxy.ts`](../web/src/proxy.ts) initializes Clerk but does not
  itself declare public/protected route groups; correctness relies on every
  protected route calling the server guard. This pattern is valid but needs a
  regression test whenever routes are added.

Recommended completion:

1. Add a route/action authorization inventory as executable tests.
2. Test direct URLs for employee details, admin account management, admin PTO,
   event editing, and another user's PTO detail.
3. Add negative mutation tests for forged employee IDs, requester IDs,
   approver IDs, visibility targets, and roles.

### 4. Administrator organization management — Partial

Implemented evidence:

- `/admin/colaboradores` provides local search, column sorting, responsive
  directory views, creation, and detail pages.
- Employee creation transactionally creates the access record, employee,
  assignment, schedule, opening PTO balance, ledger entry, and audits before
  sending the Clerk invitation.
- Administrators can change canonical personal information, role, department,
  reporting manager, position, schedule, employment status, invitations, and
  PTO balance.
- Effective-dated assignment and schedule repositories preserve historical
  records.

Gaps and risks:

- Department repository methods exist, but no route or action exposes
  department create/edit/activate/deactivate management to administrators.
- The original directory requirement includes filters by role, team, and
  status. These filters were removed in favor of local search and sorting; the
  product source has not been updated to approve that scope change.
- Deactivation prevents self-deactivation, but it does not prevent one
  administrator from deactivating the organization's final other active
  administrator. Role editing also lacks a final-admin invariant.
- `/admin/accounts` can create a platform account without an employee profile,
  assignment, schedule, or PTO balance. This second invitation path can create
  active users who cannot use core employee flows.
- The `/admin` landing route is still a construction placeholder instead of a
  coherent administration hub.

Recommended completion:

1. Add department management UI/actions and audited lifecycle changes.
2. Enforce the final-active-administrator invariant transactionally on role
   changes, deactivation, and employment termination.
3. Consolidate invitations through employee creation, or clearly restrict the
   account-only path to bootstrap/support use cases.
4. Decide whether local search is an approved replacement for the required
   role/team/status filters and update the acceptance source accordingly.

### 5. Repeatable organization creation — Partial

Implemented evidence:

- [`bootstrap-admins.mjs`](../web/scripts/bootstrap-admins.mjs) is explicit,
  idempotent, environment-driven, and refuses silent promotion.
- [`bootstrap-employee-model.mjs`](../web/scripts/bootstrap-employee-model.mjs)
  creates indexes and the initial department set idempotently.
- The employee UI can create the remaining organization one person at a time.

Gaps and risks:

- There is no repeatable seed/import for the full approved organization,
  reporting graph, schedules, and opening balances.
- The admin bootstrap creates `platform_users` but not `employees`. The normal
  employee creation flow creates a new invited platform user and therefore
  cannot safely attach an employee record to an already-bootstrapped admin.
- The platform description still names Yerlin in the organization and launch
  bootstrap even though the later approved direction removed that account.
- Seed/bootstrap scripts use Spanish console output despite the platform
  convention that technical logs and implementation identifiers are English.

Recommended completion:

1. Define a controlled organization seed input keyed by stable email only until
   Clerk IDs are linked, with departments, employees, assignments, schedules,
   roles, and opening balances.
2. Add an idempotent “attach employee profile to existing platform user” path
   for launch administrators.
3. Add dry-run, duplicate, rerun, and rollback tests.
4. Remove stale named-person requirements from the platform description and
   keep current organization data in one maintained seed specification.

### 6. Role-aware navigation, dashboard, and privacy — Not met

Implemented evidence:

- Workspace navigation gives administrators employee, account, and PTO
  management destinations; all roles receive calendar, absence, and home
  destinations.
- Employee preferred names and profile pictures are composed into the shared
  shell.
- Server read models protect employee personal data, identification, PTO
  notes, and event audiences.
- Inicio provides read/unread notifications for targeted upcoming events and
  administrator-created approved PTO.

Missing behavior:

- [`(workspace)/page.tsx`](<../web/src/app/(workspace)/page.tsx>) calls only
  `getCalendarDashboardNotifications()`. It does not show the authenticated
  user's PTO balance, recent requests, or own upcoming approved absences.
- Supervisors do not see pending direct-report requests, team absences, or team
  summaries on Inicio or another discoverable destination.
- Administrators do not see organization-wide pending requests, upcoming
  absences, invitation/setup attention items, or organization summaries on
  Inicio.
- There is no supervisor-specific navigation destination for assigned work or
  direct-report schedules.

Recommended completion:

Build the dashboard as the next vertical slice, using purpose-built server read
models rather than exposing raw employee/PTO documents:

1. Base dashboard: balance, recent own requests, own upcoming absences, and
   visible events/notifications.
2. Supervisor dashboard: assigned pending requests, direct-report upcoming
   absences, and minimal team counts.
3. Administrator dashboard: organization pending requests, upcoming absences,
   account setup/invitation exceptions, and minimal organization counts.
4. Add explicit empty, loading, error, unauthorized, mobile, and desktop states
   for every role.

### 7. Half-day and negative-balance requests — Met in code

Implemented evidence:

- PTO values are integer units where one unit is `0.5` day.
- Draft validation rejects non-half-day precision and durations below `0.5`.
- Opening balances and adjustments can be zero or negative where allowed.
- Submission and approval warnings calculate overlaps and projected negative
  balances but do not block the transition.
- Approval atomically applies the negative delta and records before/after
  snapshots, ledger movement, request history, and audit entry.
- Domain tests cover half-day conversion and precision.

Remaining release proof:

- Add a real journey that opens a low balance, submits a `0.5`-day request,
  confirms the warning, approves it, and asserts the negative balance, ledger,
  history, and calendar entry.

### 8. Routing and self-approval — Met in code

Implemented evidence:

- Collaborators resolve the current effective assignment and require an active
  supervisor or administrator manager.
- Supervisor and administrator requests enter the shared active-administrator
  pool with no hard-coded person.
- Any active administrator can decide a pending request except their own.
- The repository rechecks status and self-approval inside the decision
  transaction.
- Service tests cover collaborator routing, administrator managers, shared
  admin queues, proxy creation, and administrator decision authority.

Remaining release proof:

- Add repository integration tests for stale status, concurrent double
  decisions, inactive approvers, and self-approval under real MongoDB
  transactions.
- Add an authenticated role journey for collaborator → supervisor and
  supervisor/admin → different administrator.

### 9. Approval UI and requester history — Partial

Implemented evidence:

- Request detail renders status history with actor and timestamp.
- Assigned supervisors and administrators can approve or deny with an optional
  decision note when they reach the detail page.
- `/admin/ausencias` supplies an organization-wide administrator queue and
  status filters.

Missing behavior:

- `getPtoDashboard()` still loads `pendingApprovals`, but
  [`ausencias/page.tsx`](<../web/src/app/(workspace)/ausencias/page.tsx>) does not
  render them.
- Supervisors therefore have no normal way to discover assigned requests.
- The current UI conflicts with both the platform role model and the PTO user
  story's `Por aprobar` requirement.

Recommended completion:

1. Restore a compact supervisor approval inbox, either on Inicio or
   `/ausencias`, without bringing back unwanted organization-wide “Por
   revisar” summary content.
2. Show count, requester, dates, category, duration, overlap/negative warning,
   and a clear `Revisar` action.
3. Add empty/loading/error states and an E2E supervisor decision journey.

### 10. Calendar creation and audiences — Met in code

Implemented evidence:

- Administrators and supervisors can create, update, and soft-delete events.
- Event input supports type, title, description, all-day/timed dates, location,
  meeting link, company/department/invited visibility, and invitees.
- Server target validation rejects invalid departments and inactive/missing
  invitees.
- The repository visibility filter returns company events, own organized
  events, invited-user events, and the actor's department events; admins see
  all events.
- Supervisor event-management policy and event modal/form behavior have unit
  and component tests.

Remaining release proof:

- Add integration tests against persisted events for each audience and direct
  event-detail URL.
- Decide whether supervisors may invite active employees outside their own
  department. The current implementation allows it for events they organize;
  the product document is not explicit enough to determine whether that is
  intended.

### 11. Approved PTO calendar privacy — Met in code

Implemented evidence:

- Calendar aggregation loads only approved requests within the visible date
  range and authorized scope.
- The calendar projection contains requester display name, dates, and duration;
  it does not include collaborator notes, decision notes, balances, contact
  information, or identification.
- Calendar quick detail similarly returns only category, duration, dates,
  requester name, and approved status, with a link to the authorized full
  request detail.
- Unit/component tests assert the privacy-safe summary fields and modal link.

Remaining release proof:

- Add persisted audience tests proving a collaborator cannot obtain a
  coworker's full PTO detail by changing the URL.

### 12. Safe audit trail — Partial

Implemented evidence:

- Auth, employee, PTO, calendar, and bootstrap features write actor, action,
  target, timestamp, and constrained metadata/changed-field names.
- PTO balance accounting uses an append-only ledger with reason and before/after
  values in addition to safe audit events.
- Event mutations and PTO transitions write their audits in the same MongoDB
  transaction as the business change.

Gaps and risks:

- Invitation acceptance/activation updates the platform user record but does
  not write an `account_activated`/`invitation_accepted` audit entry.
- Department create/update/status methods do not record administrator audit
  entries.
- There is no unified admin audit reader, despite the administrator role and
  Milestone 5 requiring audit browsing.
- No automated test checks that sensitive values such as notes, emails,
  identification, tokens, invitation URLs, or adjustment reasons are excluded
  from the general audit collections.

Recommended completion:

1. Add missing activation and department audit actions.
2. Create a normalized admin-only audit read model across feature collections,
   with filters by date, actor, action family, and target.
3. Add explicit safe-metadata contract tests.
4. Define retention, support access, and operational review procedures.

### 13. Automated critical journeys — Partial

Current strengths:

- 128 passing tests cover domain schemas, PTO routing, profile image
  compression/ownership, employee models, calendar aggregation and policy,
  local directory behavior, modals, feedback, PWA installation, and accessible
  component semantics.
- Playwright verifies signed-out redirection, theme persistence, and one Axe
  scan in both themes.

Missing coverage:

- No browser test authenticates as collaborator, supervisor, or administrator.
- No browser test creates or edits an employee, accepts an invitation, manages
  MFA, creates/approves/cancels PTO, adjusts a balance, creates an event, or
  verifies audience privacy.
- Repository tests mostly mock MongoDB-facing boundaries; transaction,
  uniqueness, concurrency, history preservation, and indexes are not exercised
  against an integration database.
- Dashboard role behavior cannot be tested until the missing dashboard is
  implemented.

Recommended test pyramid:

1. Keep the fast unit/component suite.
2. Add MongoDB integration tests for employee creation, assignment history,
   final-admin invariants, PTO approval concurrency, ledger consistency,
   visibility filters, and audits.
3. Add a minimal authenticated Playwright suite for one critical journey per
   role.
4. Run a smaller deployment smoke subset against Netlify after each deploy.

### 14. WCAG and responsive behavior — Partial

Implemented evidence:

- The application has a skip link, focus-visible styles, labeled form fields,
  accessible error summaries, modal focus/escape behavior, status text in
  addition to color, theme support, reduced-motion treatment, and responsive
  layouts.
- Component tests cover modal semantics, fields, navigation, form pending
  states, and install instructions.

Gaps and risks:

- Axe currently scans only the unauthenticated sign-in surface.
- Playwright is configured only for desktop Chromium; there is no mobile
  viewport project or WebKit coverage for iOS/PWA-sensitive behavior.
- No automated keyboard journey covers employee creation, PTO, calendar event
  creation, request decisions, profile image upload, or mobile navigation.
- WCAG 2.2 AA includes behavior that Axe cannot prove, such as focus order,
  reflow, target size, instructions, error recovery, and screen-reader clarity.

Recommended completion:

1. Add authenticated Axe scans for the critical pages in light and dark themes.
2. Add desktop Chromium plus mobile Chromium and mobile WebKit projects at the
   supported breakpoints.
3. Complete a manual keyboard/screen-reader/reflow checklist for each critical
   workflow and record the evidence.

### 15. Netlify production readiness — Partial

Implemented evidence:

- [`netlify.toml`](../web/netlify.toml) uses the official Next.js runtime,
  publishes `.next`, enables skew protection, and pins Node 24.
- [`docs/deployment.md`](../docs/deployment.md), the root README, and
  [`web/.env.example`](../web/.env.example) document required Clerk, MongoDB,
  application URL, and bootstrap settings.
- `pnpm build` succeeds locally with all current routes.
- The build guard validates required variables and recognized Netlify contexts.

Gaps and risks:

- The stable Netlify site is explicitly documented as a development-only site.
  [`verify-netlify-preview.mjs`](../web/scripts/verify-netlify-preview.mjs)
  rejects Clerk live keys, so the checked-in policy does not currently support
  a true production release.
- Production Clerk, Google OAuth, Atlas, bootstrap, recovery, and domain checks
  remain pending.
- `pnpm verify` fails on formatting, while the deployment guide says it must
  pass before deployment.
- `/api/health` reports process liveness only; it does not verify MongoDB or
  Clerk readiness.
- There is no documented rollback, backup/restore verification, incident
  response, or post-deploy smoke procedure for a real production release.

Recommended completion:

1. Fix the formatting gate immediately.
2. Decide whether the existing Netlify site remains a test environment and
   create a separate production site, or evolve the guard to distinguish
   approved production from development contexts safely.
3. Provision production Clerk and Atlas with least-privilege credentials,
   apply desired provider state, bootstrap approved admins, and remove bootstrap
   variables.
4. Add dependency-aware readiness, deployment smoke checks, rollback steps, and
   Atlas restore verification.

## Cross-cutting specification drift

Before implementing more UI, update the product source so the team does not
build against contradictory rules:

1. **Named administrator:** The platform description still lists Yerlin in the
   organization, bootstrap, and Milestone 1 exit criteria. Later decisions
   removed the account and PTO now correctly uses a shared active-admin pool.
2. **PTO terminology:** `Rechazada` in the platform description conflicts with
   `Denegada` in the implemented PTO roadmap and UI.
3. **PTO product decisions:** The platform description still presents category
   balance behavior and approval effects as unresolved. The PTO user story now
   confirms one balance, all categories consuming balance, immediate approval
   effects, and terminal approved/denied states.
4. **Supervisor approval experience:** The acceptance model requires
   supervisors to approve direct-report requests, while the current UI removed
   the only review section. A compact assigned-work inbox is still required even
   if broad summary cards remain intentionally removed.
5. **Directory filters:** The source requires role/team/status filters, while
   the current product intentionally uses local search and table sorting.
6. **Team versus department:** The product uses `team` while the implementation
   uses `department`. Either define department as the MVP team entity or add a
   separate team model; do not leave the concepts implicitly interchangeable.
7. **Notifications:** The implemented dashboard has in-app read/unread
   notifications. Clarify that the out-of-scope rule applies to external email,
   SMS, push, and third-party delivery, not this local presentation feature.

## Recommended delivery sequence

The most organic path is to stabilize the product truth first, then close the
daily role journeys, then harden trust and release operations. Each slice below
should remain deployable and include its own tests.

### Phase 0 — Restore a trustworthy baseline

**Goal:** Make the repository's documented gate green and remove rules that
could send implementation in conflicting directions.

1. Fix the one Prettier failure and restore `pnpm verify` to green.
2. Update `platform-description.md` for the approved administrator, PTO,
   terminology, department/team, directory-filter, and notification decisions.
3. Decide and document the supported browsers, mobile breakpoints, and whether
   the current Netlify site is test-only or the future production site.

**Exit:** One current source of truth, clean quality gate, explicit target
environment.

### Phase 1 — Complete role-owned daily work

**Goal:** Satisfy acceptance criteria 6 and 9 without expanding scope.

1. Implement the base dashboard read model and cards for own balance, recent
   requests, approved absences, and upcoming events.
2. Add the compact supervisor assigned-approval inbox and decision journey.
3. Add administrator organization summaries and account-setup exceptions.
4. Keep all queries purpose-specific and server-authorized.
5. Add role-specific component and authenticated browser tests with mobile
   states.

**Exit:** Collaborator, supervisor, and administrator can each discover and
complete their normal daily actions from visible navigation.

### Phase 2 — Close organization and audit integrity gaps

**Goal:** Complete acceptance criteria 4, 5, and 12.

1. Add department management and audits.
2. Enforce the final-active-administrator invariant across access, role, and
   employment mutations.
3. Consolidate the account-only and employee invitation paths.
4. Add full organization seed/import and existing-admin employee attachment.
5. Add a safe, filterable administrator audit viewer.
6. Add minimal operational reports: PTO by status/category/date, upcoming
   approved absences, current/negative balances, and active users by
   role/department.

**Exit:** Organization state can be reproduced, every sensitive change is
auditable, and no supported admin action can strand the organization.

### Phase 3 — Prove security, accessibility, and data behavior

**Goal:** Complete acceptance criteria 1–3, 7–14 as verifiable launch gates,
not only code assertions.

1. Add MongoDB integration tests for critical transactions and visibility.
2. Add authenticated E2E journeys for each role, including negative cases.
3. Add Spanish rendered-copy checks and provider-flow verification.
4. Add mobile Chromium/WebKit, authenticated Axe scans, keyboard journeys, and
   a manual WCAG checklist.
5. Run privacy tests for direct URLs and forged Server Action form data.

**Exit:** The acceptance matrix is executable and repeatable in CI or a
controlled pre-release environment.

### Phase 4 — Production release readiness

**Goal:** Complete acceptance criterion 15 for a real release rather than a
development preview.

1. Provision the production Netlify, Clerk, Google OAuth, and Atlas resources.
2. Apply versioned provider configuration and Spanish templates.
3. Run the controlled organization/admin bootstrap and remove bootstrap
   credentials.
4. Verify Atlas backup/restore, monitoring, readiness, safe logs, rollback, and
   support/deactivation procedures.
5. Run authenticated smoke tests against the deployed URL and record sign-off.

**Exit:** All 15 criteria have evidence, the release can be rolled back or
recovered, and administrators have an operating guide.

## Suggested next task files

To keep delivery small and traceable, decompose the phases into focused task
documents rather than one large “finish MVP” task:

1. `tasks/dashboard-role-aware-user-story.md`
2. `tasks/supervisor-pto-inbox-user-story.md`
3. `tasks/department-management-user-story.md`
4. `tasks/organization-bootstrap-user-story.md`
5. `tasks/audit-browser-user-story.md`
6. `tasks/mvp-authenticated-e2e-plan.md`
7. `tasks/mvp-accessibility-verification-plan.md`
8. `tasks/production-readiness-runbook.md`

The first implementation task should be the role-aware dashboard together with
the supervisor PTO inbox. That closes the only acceptance criterion currently
assessed as not met and restores the missing day-to-day workflow before adding
more administration or reporting surface area.
