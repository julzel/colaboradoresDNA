# Repository audit — 7 September 2026

## Result and scope

The repository has a good foundation: strict TypeScript, server-first App Router
pages, shared UI primitives/tokens, server-side access checks, explicit integration
ports in newer slices, and transactional leave accounting. This audit found real
leave workflow, authorization, reliability, performance, and dependency defects
despite the original verification pipeline passing. The targeted fixes below are
implemented and regression-tested.

This is a source/dependency audit with selected authenticated browser checks, not
a penetration-test certificate or a guarantee that every route/device combination
is defect-free. It does not certify Atlas privileges/backups, Clerk production
configuration, hosting controls, load capacity, or the application as ready for
real HR data. The repository currently targets a development deployment.

Scope: Next.js routes/actions/HTTP handlers; feature ownership and dependency
boundaries; React forms/shared CSS/mobile layouts; MongoDB connection handling,
queries, models, transactions and indexes; authentication/authorization; dependency
advisories; and the collaborator/admin leave lifecycle. No production deployment,
bulk data migration, real leave balance adjustment, or business-policy change was
performed. Existing roadmap/planning functionality was preserved.

## Findings and implemented fixes

Paths below are relative to `web/` unless otherwise stated. Severity describes
the pre-fix impact, not a claim of demonstrated exploitation.

| Severity | Finding                                                                                                                                                                          | Remediation and evidence                                                                                                                                                                                                                                                                                                                                                                    |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High     | Blank approval/denial notes failed: the action normalized an empty string to `null`, then repository validation rejected its already-normalized input.                           | `features/pto/domain/pto.ts` now accepts absent, null, empty and non-empty decision notes idempotently. Unit tests and real MongoDB action-to-ledger tests cover approval and denial without notes.                                                                                                                                                                                         |
| High     | An old approver assignment could preserve access after a supervisor was demoted to collaborator, including calendar visibility.                                                  | `pto-service.ts` requires a current supervisor/admin role for decisions and assigned-approver detail access. Collaborators do not receive an approval queue. `pto-repository.ts` limits their calendar reads to their own requests and permits repairing assignments to demoted approvers. Real-database tests verify revoked detail/calendar access; unit tests verify decision rejection. |
| High     | Dependency lockfile included known production and development-tool advisories.                                                                                                   | Updated Sharp to 0.35.4, Playwright to 1.55.1, Vite to 7.3.6, Vitest/coverage to 3.2.7 and narrowly scoped transitive overrides. Final `pnpm audit`, including dev dependencies, reports no known vulnerabilities. Image processing and XLSX tests pass.                                                                                                                                    |
| Medium   | Supervisors had an approval count but no actionable approval queue on their personal absence page. The “pending” metric counted approvals instead of their own pending requests. | `/ausencias` now separates the personal count from a linked “Solicitudes por aprobar” section. Dashboard regression tests verify both.                                                                                                                                                                                                                                                      |
| Medium   | The leave form asked for an arbitrary duration while the server used only a half-day/full-day distinction and recalculated the total.                                            | The shared form now sends explicit `requestedPortion` via “Jornada solicitada”. The end-date field has a start-date minimum; duration remains server-owned and schedule-derived. Both creation paths share this form.                                                                                                                                                                       |
| Medium   | Fulfilled validation-error actions could reset selected form values; an approval warning could discard the decision note.                                                        | Creation/edit fields and decision notes retain their values. Draft forms explicitly dispatch the action in a transition to avoid React's native success reset on an error result. The shared submit button accepts action pending state as well as native form status. Recovery tests cover dates, half-day choice and notes.                                                               |
| Medium   | Administrator proxy creation depended on a native confirmation dialog; accounts without an active employee were offered an unusable personal creation form.                      | Proxy creation uses a visible, required shared confirmation checkbox and retains server enforcement. The personal creation action is only shown when `canRequest` is true. No entitlement/self-approval policy was relaxed.                                                                                                                                                                 |
| Medium   | A rejected MongoDB connection promise or auth index-initialization promise stayed cached, preventing recovery from a transient failure.                                          | `lib/server/mongodb.ts` evicts failed promises, safely closes the failed client, preserves concurrent reuse, and bounds connection selection/pool waiting to 10 seconds. Auth index initialization also clears failures. Two connection tests cover reuse and retry.                                                                                                                        |
| Medium   | Assignment creation and production plan transitions executed parallel operations on a shared MongoDB transaction session.                                                        | Reads now execute sequentially within those transactions. A source regression contract covers these paths. MongoDB explicitly does not support parallel operations within a transaction.                                                                                                                                                                                                    |
| Medium   | PTO list/calendar rendering repeatedly loaded each requester/approver, producing N+1 database reads.                                                                             | Added a consumer-owned PTO people port and Employee adapter using projected, deduplicated batch lookups. List views use the batch path. Calendar persistence moved out of the service into the PTO repository; the service no longer imports MongoDB. A calendar batching test verifies one name lookup rather than one per row.                                                            |
| Medium   | Security headers were not consistently defined at the application boundary.                                                                                                      | Added `nosniff`, frame denial, strict-origin referrer policy and a baseline CSP prohibiting embedding, plugins and foreign base URLs. Verified on a live local HTTP response and in a configuration test. This is not a full nonce/script CSP.                                                                                                                                              |
| Low      | PTO runtime/bootstrap index definitions had drifted: bootstrap lacked the requester-notification index.                                                                          | Aligned the bootstrap and added an index-name parity test. The migration was not run against the existing application database.                                                                                                                                                                                                                                                             |
| Low      | Personal leave filters duplicated styling; narrow detail columns cramped long values; account management used a custom page title and stylesheet outside its feature.            | Personal filters now use shared horizontally scrollable `FilterBar`/`FilterChip`, including drafts. Detail facts stack mobile-first and use Costa Rica timestamps. Accounts use `PageSectionHeader`, mobile-first grid defaults and a feature-owned stylesheet.                                                                                                                             |
| Low      | Malformed leave detail IDs raised a persistence parsing exception instead of resolving as not found.                                                                             | The authenticated detail service rejects invalid ID syntax before querying MongoDB. Covered by a unit test.                                                                                                                                                                                                                                                                                 |

The initial production dependency scan reported 11 advisories (8 high, 3 moderate).
After those updates, a separate full scan found 16 development-tool advisories
(1 critical, 10 high, 3 moderate, 2 low). The critical advisory concerned Vitest's
optional listening UI server, not the deployed Next.js runtime. All reported
advisories were resolved without a Next.js/React major-version migration.

Overrides preserve affected major versions except ExcelJS's private UUID
dependency (8 → 11.1.1); its use was checked to be the supported CommonJS `v4`
export and the workbook tests passed. Keep the overrides documented and remove
them when upstream dependency ranges include the fixes. An upstream optional
ESLint resolver WASM peer warning and deprecated ExcelJS transitive packages
remain; neither is hidden by disabling checks.

## Leave verification

### Automated evidence

`tests/integration/pto-mongodb.test.ts` runs against a uniquely allocated,
disposable MongoDB database. Only the Clerk identity boundary and Next.js
navigation/cache transport are mocked: actual actions, Zod schemas, services,
schedule calculations, repositories, transactions, audits and ledger writes run.
The test refuses to reuse an existing database and drops only its exact synthetic
database during teardown. All five scenarios passed:

| Scenario                                                                  | Verified result                                                                                                                                                                               |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Collaborator saves, edits, submits; supervisor approves with no note      | Draft changes persist; submission freezes duration/routes to the assigned supervisor; approval deducts once; replay does not deduct again; an unrelated collaborator cannot read the request. |
| Administrator denies with no note; collaborator cancels a pending request | Correct final states and no balance changes.                                                                                                                                                  |
| Administrator creates a half-day proxy request                            | Atomic approved request, one-unit deduction, ledger/audit evidence; self-approval rejected.                                                                                                   |
| Two competing approvals; supervisor demotion                              | Exactly one successful decision and ledger entry; demotion revokes detail and assigned calendar visibility.                                                                                   |
| All six non-vacation categories; missing configuration                    | Approval works without a vacation balance and creates no deduction; vacation without a balance and leave without schedule coverage fail closed.                                               |

The existing unit suite also covers schedule-duration freezing, full/half-day
rules, role routing, warning confirmation and request state transitions. New UI
tests cover error recovery, the proxy confirmation and the supervisor queue.

Reproduction command is documented in [the leave model](./pto-model.md#isolated-lifecycle-verification).
Normal verification intentionally skips live MongoDB and paid model tests.

### Authenticated browser evidence and outstanding handoff

The authorized Julio administrator account successfully created a clearly marked
synthetic, non-vacation absence for the Julio collaborator. The browser displayed
the approved result, one-day duration and three status-history events. This test
did not deduct vacation balance. The updated leave detail also rendered without
document-level overflow at 320px after the mobile layout fix.

Cleanup removed exactly one marked synthetic request and its three associated
test audit records, after checking its ID, exact test note, category and absence
of ledger entries. No balances were written. These synthetic records have no
in-app undo; existing business requests were untouched.

After the user switched to the authorized Julio collaborator account, the
authenticated browser walkthrough also passed:

- Create a half-day `other` request and reopen its persisted draft fields.
- Reject a half-day range containing two working dates while preserving both
  dates, the half-day selection, category and note.
- Correct the draft to full days, save a two-day duration, submit and show the
  assigned approver. Submitted requests no longer offer editing or self-approval.
- Create an intentionally overlapping half-day request; the first submission
  remains a draft until **Enviar de todos modos** is explicitly confirmed.
- Submit a separate one-day test request, cancel it and display the three-step
  status history without further edit/submit/cancel controls.
- Render the personal dashboard and request modal at 390px without page overflow.
  The history filter has 745px of content in its own 326px scroll area. The pending
  count correctly shows two and the vacation balance remains five days.
- Attempt direct access to `/admin/ausencias` and receive `/access-denied`.

The administrator approval/denial of these collaborator-created requests and
the final collaborator result refresh are still pending the next account switch.
The user was asked to switch locally, without sharing passwords. Do not mark the
complete two-account browser acceptance criterion finished yet.

Outstanding synthetic fixtures, all `other` with the exact note prefix
`AUDIT-QA-20260907-COLLAB-` and no intended vacation deduction:

| Request ID                 | Purpose                                    | Browser-observed state |
| -------------------------- | ------------------------------------------ | ---------------------- |
| `6a9f6d5e604f1920b4a1dab7` | Approval, edited from half-day to two days | Pending                |
| `6a9f6de4604f1920b4a1dabb` | Denial, half-day with overlap confirmation | Pending                |
| `6a9f6e75604f1920b4a1dabe` | Cancellation, one day                      | Cancelled              |

Keep these fixtures only until the two-account check finishes, then remove only
these exact requests and their synthetic audit records after checking that they
have no ledger entries. The earlier proxy fixture has already been removed.

### Quality checks

- Baseline: `pnpm verify` passed with 377 unit tests, showing why cross-layer
  lifecycle coverage was necessary.
- After fixes: `pnpm verify` passed — formatting, ESLint, Stylelint, TypeScript,
  390 tests and optimized Next.js build. Six opt-in integration tests were skipped
  in this command (five MongoDB scenarios and one paid model scenario).
- The five MongoDB scenarios passed separately against real transactional storage.
- `pnpm test:e2e`: all three existing signed-out Chromium tests passed, including
  Spanish sign-in, theme persistence and light/dark WCAG axe checks.
- `pnpm audit`: no known vulnerabilities in the final dependency tree.
- Local `/api/health` responded HTTP 200 with the new security headers and
  `Cache-Control: no-store`.

Mobile checks were sampled, not an exhaustive device matrix: `/admin/ausencias`,
`/admin/horarios` and `/admin/desarrollo` at 390px; leave detail,
`/admin/accounts`, `/admin/colaboradores`, `/admin/prioridades` and calendar agenda at 320px. Rendered
pages had no document-level horizontal overflow; tables/filters retain their own
scroll containers. Authenticated axe coverage and all detail/edit variants remain
follow-up work. Loading skeletons were not counted as successful page checks.

## Remaining work, in priority order

### P1 — acceptance and production controls

1. Finish the two-account authenticated browser leave walkthrough above, including
   warning confirmation and a collaborator result refresh. Make it repeatable with
   dedicated test identities in an isolated test deployment; never commit session
   cookies, credentials or real employee fixtures.
2. Before using real HR records, verify deployment-only controls: restricted Atlas
   network/users, separate runtime/migration credentials, backup restoration,
   Clerk production/MFA/session configuration, secret rotation, audit retention
   and least-privilege access. These external settings were not changed or
   independently certified by this repo audit.
3. Add a deployment-compatible nonce-based script CSP and evaluate centralized
   per-actor mutation/upload throttling. The added CSP only provides embedding,
   object and base-URL protections. Account invitation, image conversion and
   repeated server actions should have abuse controls independent of UI disabling.

### P2 — scalability and architecture consistency

1. **Database pagination/search:** `employee-query-service.ts` explicitly requests
   the complete directory (`paginate: false`), while PTO requester/admin histories
   load complete result sets and then filter/page in memory or in client components.
   Batching removes N+1 queries but not unbounded work. Introduce cursor pagination,
   server-side filters/counts and representative `explain()`/load tests. Do not
   silently cap results and make older requests disappear.
2. **Older slice boundaries:** new Planning and Production application layers use
   clearer neutral contracts; older PTO/Employee/Auth services still import other
   slices' repositories and older domain modules mix MongoDB document shapes with
   localized labels. Extract narrow consumer-owned ports and persistence models
   incrementally, with contract tests. The new PTO people port and calendar
   repository boundary are one scoped step, not a claim of complete migration.
3. **Index and validator lifecycle:** Auth, Employees and PTO still create some
   indexes at runtime. Bootstrap and runtime definitions can drift despite the
   new PTO parity test. Scheduling already demonstrates migration-owned schema
   administration. Consolidate index definitions and move remaining setup to
   explicit migrations after deployment sequencing is in place. The PTO
   bootstrap currently validates category, not the entire document shape; extend
   validators only after checking legacy compatibility with a dry-run migration.
4. **API decoupling:** Planning has an explicit versioned HTTP/OpenAPI contract.
   Most older first-party mutations use Server Actions, which is valid Next.js
   transport but not a public reusable HTTP contract. Keep actions thin; extract
   neutral use cases/DTOs before adding external HTTP consumers. Do not duplicate
   business rules in a REST layer or have Server Components fetch their own API.
5. **Design system maintenance:** core tokens, shared field chrome, modal,
   `PageSectionHeader`, cards, status badges and scrollable filters are reused.
   Large feature stylesheets (Calendar/PTO/Employees) and bespoke list/table
   variants still merit splitting by component and visual regression coverage.
   Prefer a narrow shared table/empty-state contract to a configurable component
   that mixes unrelated feature behavior. Check long names, empty/error/loading
   states, keyboard focus, 320–1440px widths, and both themes.

## Existing safeguards retained

- `requirePlatformUser` resolves MongoDB-owned roles from authenticated identity,
  rejects inactive/uninvited users, and enforces privileged-role MFA. Page UI is
  not treated as authorization.
- Feature components and view models do not import repositories directly; boundary
  tests and ESLint enforce important separation rules. Server Components call
  feature services rather than their own HTTP handlers.
- PTO uses integer half-day units, frozen schedule-derived duration, transactional
  request/balance/audit updates, revision/state guards and a unique approved-request
  ledger index. Negative-balance warning policy was not changed.
- Profile images have byte/pixel limits and server-side re-encoding. Development
  narrative encryption and redacted integration DTOs remain intact.
- The service worker caches public assets, not authenticated business responses.
  Sensitive feature responses retain their private/no-store policies.

## Primary technical references

- [Next.js data security](https://nextjs.org/docs/app/guides/data-security): exported
  Server Actions are public endpoints and require their own authentication and
  authorization checks.
- [MongoDB transactions](https://www.mongodb.com/docs/drivers/node/current/crud/transactions/):
  operations in a transaction must not run in parallel on the same session.
- [MongoDB connection pools](https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/connection-pools/):
  pool size and wait timeouts bound connection resources; they are not a substitute
  for load testing or query timeouts.
- [React form actions](https://react.dev/reference/react-dom/components/form):
  fulfilled form actions can reset native uncontrolled form state, including when
  application-level validation errors are returned as values.
