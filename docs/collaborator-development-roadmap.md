# Collaborator development — implementation roadmap

**Status:** Proposed  
**Date:** 2026-08-07  
**Source PRD:** [Collaborator development](./collaborator-development-prd.md)

## 1. Delivery recommendation

Build the module in vertical slices, with an administrator able to complete and
test one safe workflow before the next area begins. Do not start with a large
generic HR schema or a visually complete dashboard backed by placeholder
authorization.

Recommended sequence:

```text
Governance and prototype
        ↓
Security, encryption, indexes, and authorization
        ↓
Development dashboard and collaborator record shell
        ↓
1:1 workflow
        ↓
Skill catalog, assessments, and matrix
        ↓
Development goals
        ↓
Collaborator transparency view
        ↓
Hardening, production environment, pilot, and rollout
```

The feature may be demonstrated with synthetic data during development, but it
is not production-ready until the final security and environment gates pass.

## 2. Key assumptions

- The initial authoring audience is the current `administrator` role.
- Supervisors receive no access in MVP.
- Finalized shared records are visible to the affected collaborator; drafts are
  not.
- Narrative data is bounded plain text and encrypted at the application layer.
- No attachments, exports, rich HTML, AI, or external integrations are included.
- A 30-day 1:1 cadence is the default but can be changed per collaborator.
- Existing employee identity, assignment, profile image, and access records
  remain authoritative.
- The current Netlify/Clerk/Mongo setup is a development environment. It must
  use synthetic data only.

If administration rejects collaborator visibility or confirms that some current
administrators are not HR-authorized, stop before Phase 1 and revise the access
model. Those choices materially alter the product and data design.

## 3. Estimated delivery shape

These are planning ranges, not commitments. They assume one engineer familiar
with the repository, timely product decisions, and no production infrastructure
already prepared for confidential HR data.

| Phase                                            | Estimated effort | Production dependency       |
| ------------------------------------------------ | ---------------: | --------------------------- |
| 0. Governance, workflow discovery, and prototype |         3–5 days | Required                    |
| 1. Security and data foundation                  |         5–8 days | Required                    |
| 2. Admin module and record shell                 |         4–6 days | Required                    |
| 3. 1:1 vertical slice                            |         6–9 days | Required                    |
| 4. Skill catalog and matrix                      |        7–10 days | Required                    |
| 5. Development goals                             |         5–7 days | Required                    |
| 6. Collaborator read-only view                   |         4–6 days | Required by recommended PRD |
| 7. Hardening, pilot, and rollout                 |         5–8 days | Required                    |

Expected total for one engineer: approximately **7–10 weeks** including review
and polish. Two engineers can parallelize UI and repository/test work after
Phase 1, but security policy and domain decisions should remain shared.

## 4. Phase 0 — governance and validated UX

### Objective

Approve the workflow, privacy rules, and interaction model before sensitive
storage exists.

### Product work

- Hold a short working session with administration using three realistic but
  fictional examples:
  - a routine 1:1 with two actions;
  - a skill assessment that changes over time;
  - a development goal that becomes overdue and is later completed.
- Confirm the vocabulary: `Desarrollo`, `1:1`, `Habilidades`, and
  `Plan de desarrollo`.
- Confirm whether every administrator is an authorized HR reader.
- Confirm that finalized records are visible to the collaborator and that the
  MVP has no permanently private narrative.
- Approve prohibited-content guidance and ownership of employee correction
  requests.
- Approve or assign owners for retention, legal hold, purge, and incident
  response decisions.

### UX work

- Produce low-fidelity responsive prototypes for:
  - `/admin/desarrollo`;
  - collaborator development summary;
  - new 1:1 form and visibility confirmation;
  - desktop skill matrix and mobile skill cards;
  - collaborator read-only view.
- Test with at least two administrators and two collaborators using fictional
  data.
- Measure whether an administrator can find an overdue collaborator and record
  a simple 1:1 without explanation.

### Foundational accessibility cleanup

The workspace shell already provides the main landmark, while many route pages
render a second `<main id="main-content">`. Remove nested `main` landmarks and
duplicate IDs from workspace route roots before adding new development pages.
Keep the single main landmark in `WorkspaceShell`.

### Exit criteria

- PRD decisions are approved or explicitly amended.
- Privacy/legal review is assigned and the production retention decision has an
  owner and deadline.
- Administrator and collaborator prototypes pass the primary mobile and desktop
  tasks.
- The authorization audience is unambiguous.

## 5. Phase 1 — security and data foundation

### Objective

Create a feature boundary that is safe to build on. No user-facing navigation
should be enabled until this phase passes security tests.

### Feature structure

Create:

```text
web/src/features/development/
├── actions/
│   └── development-actions.ts
├── components/
├── domain/
│   ├── development-goal.ts
│   ├── development-profile.ts
│   ├── one-on-one.ts
│   └── skill.ts
└── server/
    ├── development-audit-repository.ts
    ├── development-encryption.ts
    ├── development-indexes.ts
    ├── development-policy.ts
    ├── development-read-repository.ts
    ├── development-repository.ts
    └── development-service.ts
```

Repositories remain server-only. Pages and Server Actions call the authorized
service rather than importing sensitive repositories directly.

### Authorization

- Add a feature policy with explicit operations such as `list`, `read_shared`,
  `read_narrative`, `write`, `finalize`, `void`, and `manage_catalog`.
- MVP administrator methods call
  `requirePlatformUser({ roles: ["administrator"] })` inside the service.
- Self-view methods call `requirePlatformUser()` and derive the employee target
  from the authenticated platform user.
- Never accept actor IDs, role, author, or visibility from client input.
- Return generic not-found/forbidden outcomes that do not reveal record
  existence.
- Add a documented seam for a later `development_records:manage` capability;
  do not implement supervisor access opportunistically.

### Encryption decision and implementation

Perform a short threat model covering application compromise, database operator,
backup, log, preview, and lost-key risks. The recommended implementation is a
small server-only envelope-encryption boundary using authenticated encryption:

- encrypted payload for narrative sections and evidence;
- fresh random nonce per record/version;
- key version stored with ciphertext;
- master keys supplied only as production server secrets and held outside
  MongoDB;
- associated data binds ciphertext to resource type and stable record ID;
- decrypt only in authorized detail reads;
- rotation and recovery scripts tested with synthetic records;
- no key in Deploy Previews, localStorage, client bundles, or the database.

If MongoDB Queryable Encryption or CSFLE is chosen instead, document operational
and deployment implications before implementation. Dates, statuses, IDs, and
due-state query fields remain outside the encrypted narrative payload.

### Collections and indexes

Implement Zod domain schemas, Mongo document types, mappings, and reviewed
indexes for the collections in the PRD. Add:

```text
web/scripts/bootstrap-development-model.mjs
```

and a `bootstrap:development-model` package script.

Indexes are created with migration credentials in production. Do not require
the runtime application user to have schema-administration permissions.

### Transactions and concurrency

- Mutable documents receive `version: number`.
- Update filters include `_id`, target employee ID where relevant, expected
  version, and allowed current status.
- A version miss returns a typed conflict rather than applying last-write-wins.
- Every mutation and its safe audit insert share a Mongo transaction.
- Audit repository methods require `ClientSession`; no optional session.

### Audit

Define content-free actions including:

- `record_viewed` for decrypted full-record access;
- `one_on_one_created`, `one_on_one_updated`, `one_on_one_finalized`,
  `one_on_one_amended`, `one_on_one_voided`;
- `skill_created`, `skill_updated`, `skill_status_changed`, `skill_assessed`;
- `goal_created`, `goal_updated`, `goal_status_changed`, `goal_progress_added`;
- `record_archived`, `retention_purge_completed`.

Audit documents contain opaque resource IDs, actor and employee IDs, action,
changed field names, timestamp, and outcome only. Decide whether an unavailable
read-audit sink must fail closed before enabling real data.

### HTTP and caching

- Mark sensitive route responses private and non-cacheable.
- Confirm the service worker never caches authenticated HTML or development API
  responses.
- Use explicit database projections so list and matrix queries never fetch
  encrypted narrative fields.
- Keep submitted text out of errors, toast keys, URLs, redirects, traces, and
  logs.

### Tests

- Domain validation and lifecycle tests.
- Role matrix tests for administrator, supervisor, collaborator, deactivated,
  and privileged account without MFA.
- Forged target ID and cross-employee resource tests.
- Encryption round-trip, wrong associated data, key version, rotation, and
  tamper-detection tests.
- Audit redaction and transaction rollback tests.
- Optimistic-concurrency conflict tests.
- Projection tests proving lists contain no narrative payload.

### Exit criteria

- Security tests pass before UI routes exist.
- Synthetic encrypted records survive rotation and recovery testing.
- An audit failure rolls back a mutation.
- A stale update cannot overwrite a newer version.
- The production data owner approves the collection and retention model.

## 6. Phase 2 — admin module and collaborator record shell

### Objective

Give administrators a fast, polished way to locate a collaborator and understand
what needs attention without exposing narrative content in the list.

### Routes and navigation

- Add a third **Desarrollo** card to `/admin` with copy:
  `Documentá reuniones 1:1, habilidades y planes de desarrollo.`
- Use a dedicated module color distinct from Ausencias orange and Colaboradores
  purple; define semantic light/dark tokens rather than reusing a status color.
- Change the admin module grid to three columns at wide widths, two at
  intermediate widths, and one on mobile.
- Add `/admin/desarrollo` breadcrumbs before the generic `/admin` branch.
- Do not add a global navigation destination; preserve the existing admin menu
  order and mobile overflow behavior.
- Add a compact Desarrollo card to the existing collaborator administrator
  detail. It shows dates/counts only, never note excerpts.

### Dashboard

- Server-render summary counts and the initial paginated directory.
- Add search and URL-backed filters for department, manager, employment status,
  1:1 due state, goal due state, and skill coverage.
- Desktop uses a semantic table; mobile uses full-card destinations with the
  same information.
- Default sort: active overdue, never reviewed, due soon, then up to date.
- Provide precise empty, loading, error, and no-match states.

### Collaborator development shell

- Reuse the canonical preferred name, assignment, Clerk photo/initials fallback,
  and employment status.
- Add real nested links for `Resumen`, `1:1`, `Habilidades`, and
  `Plan de desarrollo`; avoid client-only tabs.
- Desktop subnavigation is horizontal. Mobile subnavigation is horizontally
  scrollable with 44-pixel targets and `aria-current`.
- Primary action is `Registrar 1:1`, full text on every viewport.

### Reusable UI

Create only primitives already justified by multiple surfaces:

- `Avatar` with photo/initial fallback;
- `SectionNavigation` using real links;
- `EmptyState`;
- `MetricCard` for operational counts;
- `ActivityTimeline` when the first timeline ships.

Batch or safely cache Clerk avatar lookup for a directory; never issue one
provider request per collaborator on every render.

### Tests and exit criteria

- Administrator navigation and breadcrumb tests.
- Directory filtering/sorting tests.
- No narrative data in RSC/client props for dashboard routes.
- Keyboard, 320-pixel mobile, desktop, light/dark, and axe checks.
- Any active collaborator can be reached within three interactions from
  `/admin`.

## 7. Phase 3 — 1:1 vertical slice

### Objective

Ship the first end-to-end development workflow: record, finalize, share, review,
amend, and void a 1:1 safely.

### Domain and persistence

- Implement draft, finalized, amended, and voided lifecycle rules.
- Store bounded encrypted narrative sections and unencrypted query metadata.
- Keep action items structured and linked to the 1:1.
- Preserve amendments and void reason without overwriting original narrative.
- Compute cadence state from finalized meetings and the development profile.
- Optional calendar link validates that the event is visible to the actor; never
  copy event description into the record.

### Administrator UX

- Full-page form, not a constrained modal.
- Prefill meeting date and author.
- Structured prompts with a persistent safe-writing reminder.
- Add/remove action items with accessible fieldsets and specific remove labels.
- Explicit `Guardar borrador`, `Finalizar y compartir`, and `Cancelar` actions.
- Unsaved-change guard; no browser storage or silent local draft.
- Show last-saved status and version.
- Finalization preview clearly lists what the collaborator will see.
- Newest-first 1:1 timeline grouped by month/year without body snippets in
  collapsed summaries.
- Destructive void action is separated and confirmed.

### Tests

- Full lifecycle and invalid-transition unit tests.
- Action item validation, date, length, and control-character tests.
- Server Action authorization and actor-binding tests.
- Finalized immutability, amendment, void, conflict, encryption, and audit tests.
- Component tests for dynamic action items, error focus, pending state, and
  finalization confirmation.
- Authenticated administrator Playwright journey on mobile and desktop.

### Exit criteria

- Administrator can complete the full 1:1 lifecycle with synthetic data.
- Collaborator visibility projection contains only finalized shared content.
- No note text appears in calendar, dashboard, audit, URL, logs, or analytics.
- A routine 1:1 can be entered and finalized within the usability target.

## 8. Phase 4 — skill catalog, assessment, and matrix

### Objective

Provide consistent skill language and useful capability visibility without
ranking people.

### Catalog

- Create, edit, deactivate, and reactivate categorized skills.
- Require four behavioral anchors and reject duplicate normalized names.
- Provide catalog setup guidance and a synthetic/demo template, not an assumed
  production taxonomy.
- Preserve assessments when a skill is deactivated.

### Assessment

- `Sin evaluar` remains distinct from levels 1–4.
- Updating a skill requires date, anchored level, and bounded observable
  evidence.
- Current snapshot, immutable history, and audit write occur in one transaction.
- Individual record shows category groups, current level, assessor, date, and
  history.
- Use an explicit edit mode rather than permanently interactive cells.

### Matrix

- Desktop semantic table with caption, scoped headers, sticky collaborator
  column, limited skill group, filters, and keyboard-operable cells.
- Mobile provides collaborator-first and skill-first cards with complete textual
  information.
- Use text for every level and state; color is supplemental.
- Never calculate or expose a composite score, ranking, or leaderboard.
- Paginate collaborators and limit skill columns per query.

### Tests and exit criteria

- Catalog uniqueness/status tests.
- Anchored level and evidence validation tests.
- Assessment history/snapshot transaction tests.
- Table semantics, keyboard, mobile equivalence, theme, and axe tests.
- Matrix response contains no 1:1 or goal narrative.

## 9. Phase 5 — development goals

### Objective

Turn opportunities into dated, supported, observable development work.

### Implementation

- Create goals from the collaborator record, a finalized 1:1, or a skill.
- Store encrypted outcome, success criteria, organization support, and progress
  narratives.
- Store status, dates, IDs, and due-state query metadata separately.
- Implement planned, in-progress, paused, completed, and reopen transitions.
- Append progress updates; never overwrite history.
- Link skills and originating 1:1 with validated same-employee references.
- Calculate overdue state using the Costa Rica business date.

### UX

- Call the area `Plan de desarrollo` or `Áreas de enfoque`, never a failure list.
- Use neutral/information tones for plan status; danger is reserved for
  destructive actions.
- Show active goals prominently and completed goals in history.
- Provide clear organization-support and next-action fields.

### Tests and exit criteria

- Lifecycle, cross-employee link, due-date, and stale-version tests.
- Audit and encryption tests for all narrative changes.
- Administrator goal flow component and E2E tests.
- Dashboard goal counts agree with record details.

## 10. Phase 6 — collaborator read-only view

### Objective

Make finalized development records transparent and understandable without
granting cross-employee access or editing rights.

### Route and navigation

- Add `/perfil/desarrollo` linked from the existing profile page.
- Do not change global collaborator navigation order.
- Resolve the employee only from the authenticated platform identity.

### Content

- Explain purpose, visibility, author, and dates.
- Show finalized 1:1 summaries and amendments, agreed actions, skills and level
  definitions, goals, and progress.
- Exclude drafts, voided content from normal view, admin workflow counts, and
  internal audit documents.
- Add a clear path for requesting a factual correction, even if the request is
  handled outside the app for MVP.

### Tests and exit criteria

- Cross-employee identifier manipulation never changes the self target.
- Draft and administration-only metadata are absent from serialized props.
- Collaborator journey passes mobile/desktop keyboard, screen-reader, theme,
  and axe tests.
- Administration signs off that the displayed record matches the information
  shared during a 1:1.

## 11. Phase 7 — hardening and rollout

### Production environment gate

The current deployment is development-only. Before real HR data:

- provision production Clerk and MongoDB instances;
- use a production-specific database and least-privilege runtime user;
- keep migration/index permissions separate;
- prevent Deploy Previews and local environments from receiving production DB
  credentials or encryption keys;
- verify TLS, Atlas encryption at rest, encrypted backups, restore access, and
  restore testing;
- verify Clerk domain, OAuth, MFA, account, and email policies;
- add private/no-store verification for protected responses;
- complete key backup, rotation, and disaster-recovery exercises;
- complete the Costa Rica privacy/legal review and publish the internal privacy
  notice and writing policy.

### Test infrastructure

Current end-to-end tests cover signed-out and theme flows only. Add an
authenticated test harness with synthetic administrator, supervisor,
collaborator, deactivated, and no-MFA fixtures. Tests must prove server
authorization, not only UI visibility.

Run:

```bash
cd web
pnpm verify
pnpm test:e2e
```

Add repository integration tests against an isolated Mongo database for
transactions, indexes, optimistic concurrency, and projections.

### Security review checklist

- Threat model reviewed.
- Administrator audience approved.
- Narrative reads and all mutations audited without content.
- Audit storage is append-only at the database permission layer or forwarded to
  an immutable sink.
- Retention, purge, backup deletion, and legal hold procedures tested.
- Repeated forbidden access can be detected without logging sensitive values.
- Error monitoring and analytics payloads are inspected for redaction.
- No production secret or HR data reaches preview builds.
- Synthetic data is clearly distinguishable from production records.

### Pilot

1. Internal synthetic-data acceptance with administration.
2. Production pilot with a small, explicitly selected group after privacy notice
   and training.
3. Two-week review of usability, correction requests, access logs, and support.
4. Fix high-severity findings before expanding.
5. Gradual rollout by department; do not bulk-import historical free-form notes.

### Operational training

Train administrators to:

- write observable, concise, job-relevant information;
- avoid prohibited sensitive content;
- explain what becomes visible to collaborators;
- use amendments instead of rewriting history;
- respond to correction/access requests;
- handle void, legal hold, incident, and offboarding procedures.

### Exit criteria

- Product, security, administration, and privacy/legal owners sign off.
- Production restore and encryption-key recovery tests succeed.
- No critical/high security or accessibility findings remain.
- Pilot users complete primary tasks without assisted workarounds.
- Monitoring and incident ownership are active.

## 12. Cross-cutting implementation rules

### Server boundaries

- Pages are Server Components by default.
- Client Components receive the smallest safe view models.
- Every Server Action validates with Zod, authenticates, authorizes the target,
  and maps only safe errors.
- Development reads always enter through `development-service.ts`.
- Use explicit Mongo projections and server pagination.

### Narrative safety

- Recommended maximums:
  - each 1:1 section: 2,000 characters;
  - shared summary: 1,500 characters;
  - action description: 300 characters;
  - skill evidence: 750 characters;
  - goal outcome/success criteria/support: 1,000 characters each;
  - progress update: 1,000 characters.
- Normalize Unicode, reject control characters, and render as React text.
- Do not use the global 2 MB Server Action body limit as a domain limit.

### Dates and time

- Business dates use `YYYY-MM-DD` in `America/Costa_Rica`.
- Audit and system timestamps use UTC `Date` values.
- Overdue calculations reuse the existing Costa Rica date utilities.

### Soft deletion and retention

- Ordinary UI actions archive, deactivate, void, or amend.
- No normal Server Action hard-deletes HR records.
- Do not use Mongo TTL indexes for primary records because deletion would bypass
  the transactional audit workflow.
- A reviewed maintenance process performs approved purge and leaves a
  content-free audit record.

### Performance

- Never fetch narrative bodies for dashboard, matrix, notifications, or search.
- Avoid one Clerk request per avatar; batch or cache safe avatar resolution.
- Paginate 1:1 history, goals, audit history, and collaborator lists.
- Limit matrix skills per request and keep filters in the URL.

## 13. Proposed test inventory

### Unit/domain

- Schemas, normalization, text limits, state machines, date logic, skill anchors.
- Authorization policy matrix.
- Encryption and key version behavior.
- View-model redaction.

### Repository/integration

- Unique indexes and inactive-skill behavior.
- Transactional mutation plus audit.
- Assessment snapshot plus history.
- Goal progress history.
- Stale version conflicts.
- Employee/archive relationships.
- Explicit projection tests.

### Component

- Dashboard search/filter/sort.
- Dynamic 1:1 action items and error summary.
- Finalization/visibility confirmation.
- Section navigation and focus behavior.
- Matrix desktop table and mobile cards.
- Goal lifecycle controls.
- Empty, loading, error, conflict, and destructive confirmation states.

### End-to-end

- Administrator completes each P0 workflow.
- Supervisor and collaborator cannot access admin routes or forge mutations.
- Collaborator sees only their finalized record.
- Deactivated users and no-MFA administrators fail closed.
- Mobile and desktop critical paths.
- Light/dark axe scans and manual keyboard checks.
- Protected response caching and service-worker behavior.

## 14. Definition of done

A phase is not complete because its happy-path screen renders. It is complete
when:

- domain and permission rules are written and tested;
- server reads use minimum projections;
- mutations validate, authorize, transact, audit, and revalidate correctly;
- empty, loading, error, unauthorized, and conflict states exist;
- mobile and desktop behavior is intentional;
- keyboard and screen-reader behavior is verified;
- light and dark themes pass;
- no sensitive text reaches logs, URLs, analytics, audits, or broad list props;
- documentation and bootstrap/migration instructions are current;
- `pnpm verify` and applicable authenticated E2E tests pass.
