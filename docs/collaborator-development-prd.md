# Collaborator development — product requirements

**Status:** Proposed  
**Date:** 2026-08-07  
**Product label:** Desarrollo  
**Primary route:** `/admin/desarrollo`

## 1. Executive summary

Colaboradores DNA should add a third administration module, **Desarrollo**, for
maintaining a useful, secure development record for every collaborator. The
module brings together:

- regular 1:1 records and agreed follow-up actions;
- a shared skill catalog and collaborator skill matrix;
- strengths and development opportunities;
- concrete development goals with dates and progress;
- an operational overview that tells administration who needs attention next.

This is a continuous development tool, not a hidden personnel dossier, a
disciplinary case-management system, or a numeric employee-ranking system.
The experience should help administrators prepare better conversations and
follow through on commitments while keeping the collaborator informed about
finalized records that concern them.

## 2. Product decision

Build a dedicated `development` feature linked to the existing employee record.
Do not add notes or growing histories directly to `employees`, and never place
development notes in calendar event descriptions.

The first production release should include:

1. an administrator development dashboard;
2. one development record per collaborator;
3. draft and finalized 1:1 records with action items;
4. an organization-managed skill catalog;
5. a filterable skill matrix and assessment history;
6. development goals linked to skills or 1:1s;
7. a read-only collaborator view of finalized information;
8. immutable, content-free audit events for every sensitive mutation.

The interface will be in Spanish and must work equally well on mobile and
desktop, in light and dark themes.

> **Environment gate:** the repository's current Clerk, MongoDB, and Netlify
> setup is explicitly a development environment. Only synthetic development
> records may be used until a separate production environment and the security
> gates in the implementation roadmap are complete.

## 3. Problem and opportunity

Administration currently has employee, assignment, schedule, access, calendar,
and absence information, but no durable way to answer:

- When was the last 1:1 with this collaborator?
- What was agreed, and which actions are still open?
- What are this person's demonstrated strengths?
- Which skills are developing, current, or not yet assessed?
- What support or learning has the organization committed to provide?
- Which collaborators are overdue for a development conversation?

Without a shared process, development context becomes fragmented across memory,
messages, and documents. Follow-up becomes inconsistent, skill assessments are
hard to compare, and sensitive information may be stored in inappropriate
places.

## 4. Product principles

### Development before judgment

The product should emphasize coaching, support, observable evidence, and clear
next steps. It must not produce a single performance score, rank collaborators,
or infer promotion, compensation, or termination recommendations.

### Structured enough to act, light enough to use

1:1 records should provide prompts and action tracking without becoming long
forms. The common path should take less than two minutes after a conversation
when the administrator already has concise notes.

### Transparency by design

Drafts are not shown to the collaborator. Once finalized, the summary, agreed
actions, skill assessments, and development goals are visible in the
collaborator's own read-only view. The MVP has no permanently private narrative
field. A future confidential HR case system must be designed separately.

### Facts, not sensitive speculation

Forms must prompt authors to record observable behavior, outcomes, agreements,
and support. They must explicitly discourage medical information, family
details, rumors, protected characteristics, compensation discussions,
disciplinary allegations, or unrelated personal information.

### History is preserved

Finalized 1:1 records and historical skill assessments are append-only.
Corrections create a dated amendment. Records are voided with a reason rather
than silently deleted.

## 5. Users and authorization

| User             | MVP access                                                                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Administrator    | View all development summaries; create and finalize 1:1s; assess skills; manage goals; manage the skill catalog; void records with a reason. |
| Collaborator     | View only their own finalized 1:1 summaries, actions, skill assessments, and development goals. No editing in MVP.                           |
| Supervisor       | No development-module access in MVP. Existing reporting relationships must not implicitly grant access to sensitive notes.                   |
| Deactivated user | No application access. Historical records remain archived according to retention policy.                                                     |

Every server read and mutation must authorize independently. Administrator
eligibility is derived from `requirePlatformUser({ roles: ["administrator"] })`;
the actor identifier is never accepted from a form. Collaborator reads derive
the target employee from the authenticated platform identity.

Before production launch, administration must decide whether every current
administrator is an HR-authorized reader. If not, a feature-specific capability
such as `development_records:manage` is a launch dependency; hiding navigation
is not sufficient.

## 6. Scope

### P0 — production MVP

- Administration module entry and breadcrumbs.
- Development dashboard with search, filters, attention states, and coverage
  summaries.
- Per-collaborator development record.
- Configurable 1:1 cadence per collaborator, with a 30-day default.
- Draft, finalize, amend, and void lifecycle for 1:1 records.
- Structured 1:1 summary and action items.
- Skill catalog with categories and four behaviorally anchored levels.
- Current skill assessment plus immutable assessment history.
- Desktop skill matrix and equivalent mobile list views.
- Development goals and dated progress updates.
- Read-only collaborator development view.
- Server-side authorization, narrative-field encryption, optimistic concurrency,
  audit trails, retention metadata, and no-content logging rules.
- Loading, empty, error, stale-write, and permission-denied states.
- Responsive, keyboard, screen-reader, light-theme, and dark-theme coverage.

### P1 — next release

- Collaborator acknowledgement and factual-correction request.
- In-app reminders for overdue 1:1s, actions, and goals.
- Optional link between a 1:1 record and a calendar 1:1 event; notes remain in
  the development module.
- Role or position skill profiles with target levels and gap views.
- Reusable 1:1 templates by department or conversation type.
- Goal owner split between collaborator and administration.

### P2 — later

- Supervisor access scoped to an effective reporting relationship and explicit
  feature capability.
- Collaborator self-reflection before a 1:1.
- Controlled exports with purpose, scope, watermark, and audit record.
- Organization-level capability trends using minimum group sizes to avoid
  exposing individuals.
- Integrations with learning content or external HR systems.

### Explicit non-goals

- Disciplinary cases, grievances, medical or occupational-health records.
- Compensation, promotion, succession, or termination decisions.
- Anonymous feedback or 360-degree reviews.
- File attachments or arbitrary rich HTML in MVP.
- Employee leaderboard, forced distribution, composite score, or ranking.
- Sentiment analysis, AI summaries, automated recommendations, or predictions.
- Full-text search across narrative notes.
- Email, Slack, or external reminder integrations in MVP.

## 7. Information architecture

### Administrator routes

| Route                                                            | Purpose                                                      |
| ---------------------------------------------------------------- | ------------------------------------------------------------ |
| `/admin/desarrollo`                                              | Operational overview and collaborator development directory. |
| `/admin/desarrollo/habilidades`                                  | Skill matrix.                                                |
| `/admin/desarrollo/catalogo`                                     | Skill catalog administration.                                |
| `/admin/colaboradores/[employeeId]/desarrollo`                   | One collaborator's development record.                       |
| `/admin/colaboradores/[employeeId]/desarrollo/1-a-1/nueva`       | Create a 1:1 draft.                                          |
| `/admin/colaboradores/[employeeId]/desarrollo/1-a-1/[meetingId]` | Read, edit draft, finalize, amend, or void a 1:1.            |
| `/admin/colaboradores/[employeeId]/desarrollo/objetivos/nuevo`   | Create a development goal.                                   |

### Collaborator route

`/perfil/desarrollo` is reachable from the existing profile view. It does not
change the primary navigation order. It shows finalized shared information only.

### Existing integration points

- Add **Desarrollo** as the third card at `/admin`, with its own icon and color.
- Add a **Desarrollo** card to the administrator collaborator detail.
- Reuse the existing collaborator photo, preferred display name, current
  assignment, status badges, `BackLink`, and workspace breadcrumbs.

## 8. Core experiences

### 8.1 Administrator development dashboard

The dashboard leads with action, not decoration.

Header:

- title: `Desarrollo`;
- primary action: `Registrar 1:1`;
- secondary destination: `Matriz de habilidades`;
- catalog management is a lower-emphasis action.

Operational summary:

- collaborators with 1:1 cadence up to date;
- 1:1s due soon;
- overdue 1:1s;
- overdue development actions or goals;
- collaborators with incomplete skill coverage.

These are workflow counts, not performance scores.

Directory:

- search by collaborator, department, or position;
- filters for department, 1:1 state, goal state, skill coverage, and employment
  status;
- each row/card shows photo or initials, preferred name, position, department,
  last finalized 1:1, next due date, open actions, active goals, and one clear
  `Ver desarrollo` action;
- default sorting puts overdue and never-reviewed active collaborators first.

### 8.2 Collaborator development record

The record header repeats the trusted collaborator identity and current
assignment. It includes:

- `Registrar 1:1` as the primary action;
- current 1:1 cadence and next due date;
- compact tabs or segmented navigation: `Resumen`, `1:1`, `Habilidades`,
  `Plan de desarrollo`, `Historial`.

The summary tab shows:

- a next-attention panel;
- recent strengths and development opportunities derived from explicit records,
  never algorithmically inferred;
- active goals and overdue actions;
- recent skill changes;
- a chronological activity timeline without exposing audit internals.

### 8.3 Record a 1:1

Fields:

- conversation date, prefilled to today and editable;
- optional link to a calendar event;
- `Avances y logros`;
- `Retos o bloqueos`;
- `Retroalimentación y oportunidades`;
- `Apoyo acordado por la organización`;
- concise `Resumen compartido`;
- zero or more action items with description, responsible party, optional due
  date, and status.

Behavior:

- use bounded plain text, not raw HTML;
- show an always-visible privacy-writing reminder;
- provide explicit `Guardar borrador` and `Finalizar y compartir` actions;
- guard navigation when there are unsaved changes;
- never persist note content to browser storage;
- show a final visibility preview before finalization;
- finalized content is immutable; `Agregar corrección` creates an amendment;
- voiding requires a reason and preserves the original record.

### 8.4 Skill catalog and assessment

Skills belong to an organization-managed catalog rather than free-text employee
tags. A skill has a name, category, description, status, and four level anchors:

| Level | UI label      | Anchor                                                        |
| ----- | ------------- | ------------------------------------------------------------- |
| 1     | Fundamentos   | Performs with regular guidance.                               |
| 2     | En desarrollo | Handles routine work with occasional support.                 |
| 3     | Autónomo      | Performs the expected scope independently and consistently.   |
| 4     | Referente     | Guides others or improves the practice beyond their own work. |

`Sin evaluar` is a state, not level zero.

Every assessment records the level, assessment date, administrator, and a short
observable evidence statement. Changing a level appends history and updates the
current snapshot atomically. An assessment never produces an overall employee
score.

The desktop matrix uses a semantic table, sticky collaborator column, a limited
skill group per view, keyboard-operable cells, text labels/tooltips, and filters.
Mobile switches to collaborator-first or skill-first cards instead of forcing a
wide table into a narrow viewport.

### 8.5 Development goals

An area for improvement is represented as a constructive goal, not a permanent
negative label.

Each goal includes:

- title;
- intended outcome or success evidence;
- optional linked skills and originating 1:1;
- start and target dates;
- status: `Planificado`, `En progreso`, `Completado`, or `Pausado`;
- support committed by the organization;
- append-only dated progress updates;
- completion note and date.

Overdue means the target date passed while the goal is planned or in progress.
The UI must avoid labeling the collaborator themselves as failing.

### 8.6 Collaborator view

The collaborator sees:

- a clear explanation of the purpose and visibility of the feature;
- finalized 1:1 shared summaries and amendments;
- their agreed action items;
- current skill assessments with level definitions and history;
- development goals and progress;
- who recorded each item and when.

Drafts, administration workflow counts, and internal audit events are excluded.

## 9. Record lifecycle

### 1:1 states

```text
Draft → Finalized → Amended (zero or more times)
   └──────────────→ Voided with reason
```

- Drafts are editable by authorized administrators.
- Finalization writes the final timestamp and visibility state atomically.
- Finalized narrative is never overwritten.
- Amendments reference the original record and explain the correction.
- Voiding removes the record from normal summaries but preserves it for
  authorized history and audit review.
- There is no hard-delete UI.

### Skill assessment lifecycle

Every change creates an immutable assessment-history entry and updates a current
snapshot in one transaction. Deactivating a skill prevents new assessments but
does not erase history.

### Goal lifecycle

Goals preserve status and progress history. Reopening a completed goal is a new
audited transition; it does not erase completion history.

## 10. Proposed data model

Use a separate `web/src/features/development/` domain and separate collections:

| Collection                          | Responsibility                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| `development_profiles`              | Per-employee cadence and development configuration.                                              |
| `development_one_on_ones`           | Draft metadata, encrypted narrative payload, finalization, amendments, and void state.           |
| `development_skills`                | Skill catalog, categories, behavioral anchors, and active state.                                 |
| `employee_skill_assessments`        | Current employee-skill snapshot for fast record and matrix reads.                                |
| `employee_skill_assessment_history` | Immutable assessment events.                                                                     |
| `development_goals`                 | Current goal state and encrypted narrative fields.                                               |
| `development_goal_updates`          | Immutable dated progress updates.                                                                |
| `development_audit`                 | Safe action, actor, target IDs, changed field names, time, and outcome; never narrative content. |

All records use `ObjectId` references to the existing employee and platform-user
records. Do not duplicate collaborator names, departments, profile photos, or
positions; resolve current identity from the existing authoritative sources.

Mutable records include an integer `version`. Updates use compare-and-set so a
stale browser cannot silently overwrite another administrator's work.

### Required indexes

- unique development profile by `employeeId`;
- 1:1 timeline by `{ employeeId, occurredOn desc }`;
- draft ownership/update lookup by `{ authorPlatformUserId, status, updatedAt }`;
- unique active skill name by normalized name;
- skill catalog by `{ status, category, name }`;
- unique current assessment by `{ employeeId, skillId }`;
- assessment history by `{ employeeId, skillId, assessedAt desc }`;
- goals by `{ employeeId, status, targetDate }`;
- goal updates by `{ goalId, occurredAt desc }`;
- audit timelines by employee, target record, actor, and creation time.

## 11. Privacy and security requirements

Development records are sensitive employment data. Production launch requires
a documented privacy review against Costa Rica's Law No. 8968 and its
regulations; this PRD is a product specification, not a legal determination.

Mandatory controls:

- server-only reads through an authorized development service; pages must not
  import an unrestricted notes repository;
- least-privilege projections: dashboard and matrix queries never fetch 1:1
  narrative bodies;
- MFA-backed administrator sessions through the existing platform boundary;
- narrative sections, skill evidence, goal outcomes, and progress notes encrypted
  at the application boundary with versioned keys;
- query metadata such as employee IDs, dates, statuses, and due dates stored
  separately from encrypted narrative payloads;
- TLS in transit and Atlas encryption at rest remain required;
- no narrative content in URLs, logs, analytics, feedback parameters, audit
  records, notifications, or calendar descriptions;
- a content-free `record_viewed` access event whenever an administrator decrypts
  a complete 1:1 record; decide during governance whether audit unavailability
  must fail closed;
- explicit maximum lengths and control-character rejection through Zod;
- no raw HTML, attachments, or third-party editor payloads in MVP;
- no shared/public caching of decrypted responses;
- transactional audit writes for create, update, finalize, amend, void, skill
  assessment, goal transition, and catalog changes;
- rate limits or abuse controls on narrative mutations;
- a key rotation and recovery procedure tested before production data exists;
- a documented correction, access, retention, legal-hold, and deletion process.

Proposed retention default is the active employment period plus 24 months, then
review or purge, but administration and qualified Costa Rican privacy/legal
advisers must approve the actual period before launch. The product must not
collect records indefinitely merely because storage is available.

## 12. Accessibility and responsive requirements

- Meet WCAG 2.2 AA and the existing design-system requirements.
- Maintain a logical heading hierarchy and one page-level `h1`.
- All form fields have visible labels, instructions, error association, and
  status announcements.
- Touch targets are at least 44 CSS pixels on mobile.
- Status never depends on color alone.
- The skill matrix has real table semantics on desktop and a complete non-table
  mobile representation.
- Dialog focus is trapped and returned correctly; destructive actions include
  an explicit confirmation and consequence.
- Draft/finalized/overdue states are conveyed in text.
- Both themes pass automated contrast checks; the new module receives a distinct
  semantic icon color in each theme.
- Motion is minimal and respects `prefers-reduced-motion`.

## 13. Empty, loading, and failure states

The feature must deliberately support:

- no development records yet, with `Registrar primer 1:1` guidance;
- no skills configured, with a catalog setup path;
- skill exists but collaborator is `Sin evaluar`;
- no active goals, without implying failure;
- employee inactive or access deactivated;
- provider profile image unavailable, with initials fallback;
- concurrent update conflict, showing who/when changed the record and preserving
  the user's unsaved text for manual reconciliation;
- temporary database or encryption-service failure, with no partial write;
- unauthorized access, returning the existing access-denied experience;
- long directories and histories with server pagination.

## 14. Functional acceptance criteria

### Authorization and privacy

- A collaborator cannot request another employee's development data by changing
  a URL or form identifier.
- A supervisor cannot read or mutate any development record in MVP.
- An administrator can access the module only after existing MFA and account
  checks pass.
- Dashboard, directory, and matrix responses contain no decrypted 1:1 narrative.
- Audit documents contain no note, evidence, goal, or amendment text.
- Reading a decrypted administrator narrative creates a content-free access
  audit event.
- A stale version returns a conflict and never overwrites newer data.

### 1:1s

- An administrator can save a valid draft and return to it.
- Finalization requires a shared summary or at least one structured discussion
  section and shows a visibility confirmation.
- A collaborator sees the finalized record but never the draft.
- Finalized narrative cannot be edited in place.
- Amendment and void operations preserve history and create audits.
- Open actions appear on both the collaborator record and admin dashboard.

### Skills

- An administrator can create, edit, deactivate, and reactivate a skill.
- Duplicate normalized skill names are rejected.
- Every selectable level shows its behavioral anchor.
- An assessment update creates history and updates the matrix atomically.
- No aggregate employee score or rank is displayed or returned.
- Desktop and mobile provide the same assessment information and actions.

### Goals

- An administrator can create a goal from the collaborator record, a 1:1, or a
  skill assessment.
- Status transitions and progress updates are historical and audited.
- Overdue state is calculated consistently from the Costa Rica business date.
- The collaborator can read the current goal and its updates.

### UX quality

- An administrator can reach any collaborator record in at most three
  interactions from `/admin`.
- The primary action on a collaborator development record is `Registrar 1:1`.
- The dashboard remains useful at 320 CSS pixels and at desktop widths.
- Critical admin and collaborator journeys pass keyboard, screen-reader, axe,
  light-theme, and dark-theme checks.

## 15. Success measures

Measure process adoption and follow-through, not employee worth:

- percentage of active collaborators with a configured cadence;
- percentage with a finalized 1:1 within cadence;
- median time from due date to finalized 1:1;
- percentage of agreed actions completed by due date;
- percentage of active collaborators with assessed required/catalog skills;
- percentage of active development goals with a progress update in the last 30
  days;
- median time to record and finalize a 1:1;
- correction requests and privacy incidents;
- task completion and usability feedback from administrators and collaborators.

Analytics events may contain route, action type, duration bucket, and outcome.
They must never contain employee names, IDs usable outside the application,
note text, skill evidence, goal text, or other narrative content.

## 16. Risks and mitigations

| Risk                                                        | Mitigation                                                                                                                          |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| The feature becomes a hidden negative dossier.              | No permanently private narrative in MVP; finalized records are visible to the collaborator; writing guidance and governance review. |
| Subjective skill ratings reinforce bias.                    | Behavioral anchors, evidence requirement, history, no aggregate score, and future calibration workflow.                             |
| All administrators are broader than HR.                     | Launch decision on feature capability; server policy helper prepared for granular access.                                           |
| Notes capture medical, family, or disciplinary information. | Explicit prohibited-content guidance, bounded structured fields, no attachments, training, and periodic audit.                      |
| Concurrent administrators overwrite work.                   | Versioned compare-and-set updates and conflict recovery UI.                                                                         |
| Matrix becomes unusable on mobile.                          | Dedicated card/list representation rather than a compressed wide table.                                                             |
| Calendar visibility leaks notes.                            | Calendar stores scheduling only; development narratives remain in encrypted development collections.                                |
| Data grows without limit.                                   | Separate paginated collections and approved retention/purge process.                                                                |
| Encryption key loss or rotation failure.                    | Versioned envelope, documented backup/rotation procedure, and pre-launch recovery test.                                             |

## 17. Decisions required before implementation

The recommended defaults are included so work can proceed unless administration
chooses otherwise.

| Decision                | Recommended default                                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Feature name            | `Desarrollo` in navigation; `Desarrollo de colaboradores` in explanatory copy.                                    |
| Default 1:1 cadence     | Every 30 days, configurable per collaborator.                                                                     |
| Who can administer      | Current administrators only for development; add a granular capability if any administrator is not HR-authorized. |
| Collaborator visibility | Finalized records visible; drafts hidden; no private narrative field.                                             |
| Skill scale             | Four anchored levels plus `Sin evaluar`.                                                                          |
| Retention               | Proposed 24 months after employment ends, subject to formal legal/privacy approval.                               |
| Narrative editor        | Bounded plain text in MVP.                                                                                        |
| Calendar integration    | Optional link only; never copy notes into the calendar.                                                           |
| Supervisor access       | Out of scope until a separate authorization design is approved.                                                   |

## 18. Research basis

The design treats development as a continuous process of objectives, feedback,
learning, and support rather than an annual rating exercise. It also prioritizes
purpose limitation, data minimization, transparency, and the ability to correct
employment information.

- [CIPD: Performance management](https://www.cipd.org/en/knowledge/factsheets/performance-factsheet/)
- [CIPD: Effective performance management](https://www.cipd.org/en/knowledge/guides/effective-performance-management/)
- [CIPD: Competence and competency frameworks](https://www.cipd.org/en/knowledge/factsheets/competency-factsheet/)
- [Acas: Reviews and appraisals](https://www.acas.org.uk/performance-management)
- [NIST Privacy Framework](https://www.nist.gov/privacy-framework)
- [PRODHAB: Costa Rica data-protection legislation](https://www.prodhab.go.cr/acercade/normativa/)
