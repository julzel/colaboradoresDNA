# Platform description and MVP roadmap foundation

## Document status

**Status:** Product direction approved and ready to be decomposed into MVP
epics and implementation tasks.

This document defines the MVP boundary, users, permissions, domain rules,
delivery order, and release criteria for Colaboradores DNA. Detailed interface
designs, database schemas, and implementation plans should reference this
document rather than redefine its product rules.

## Company and operating context

Colaboradores DNA is an internal platform for a Costa Rican startup and PYME.
The initial team is small, so the MVP should favor clear workflows, low
administrative overhead, and maintainable authorization rules over enterprise
complexity.

Product defaults:

- Supported locale: `es-CR`.
- Company timezone: `America/Costa_Rica`.
- User-facing language: Spanish.
- Application code and technical identifiers: English.
- Access model: private and invitation-only.
- Primary deployment: Netlify.
- Primary application database: MongoDB Atlas.

The platform supports internal operations but does not replace legal, payroll,
accounting, or professional human-resources advice. Company policies and Costa
Rican employment requirements must be validated outside this product document.

## Product vision

Colaboradores DNA centralizes the information and workflows collaborators need
to understand and participate in the company’s daily operations.

The platform should give each collaborator one trusted place to:

- Review relevant events and schedules.
- Request and track vacations, leave, and other absences.
- Complete tasks appropriate to their role.
- Understand the current state of requests that affect them or their team.

The product must remain simple for the current organization while allowing
teams, reporting relationships, roles, and future workflows to change without
hard-coded organizational logic.

## MVP outcomes

The MVP should:

1. Provide secure, invitation-only access for active collaborators.
2. Establish a data-driven directory of users, teams, roles, and reporting
   relationships.
3. Replace manual PTO coordination with a visible request and approval
   workflow.
4. Provide a shared calendar with company, team, and invited-user visibility.
5. Give administrators and supervisors the information needed to manage their
   authorized scope.
6. Protect private employee data with server-enforced authorization.
7. Record sensitive changes and decisions in an audit trail.

Announcements are part of the longer-term product vision but are not included
in the initial MVP.

## Language and implementation conventions

### User-facing language

All text rendered to an end user must be in Spanish. This includes:

- Navigation, page titles, headings, buttons, links, labels, and helper text.
- Loading, empty, success, validation, error, unauthorized, and not-found
  states.
- Authentication, invitation, verification, account-recovery, and MFA screens.
- Transactional email templates managed through the authentication provider.
- Accessibility names, alternative text, visually hidden instructions, and
  meaningful ARIA descriptions.
- Dates, times, calendar labels, status labels, filters, reports, and exported
  content.
- Seeded or demonstration content visible in the application.
- Page metadata displayed by browsers or link previews.

Use clear Costa Rican Spanish and avoid unnecessary English terminology. The
MVP supports one locale and does not require a language selector.

Dates and times must use locale-aware formatting with `es-CR` and
`America/Costa_Rica`. Persist timestamps in UTC.

### Code language

Implementation must use English for:

- Files, folders, modules, components, functions, variables, and types.
- Database collections, fields, indexes, and migration names.
- API paths, internal event names, enum values, and permission keys.
- Test descriptions, comments, logs, and technical documentation.

User-facing Spanish text must not leak into domain identifiers. For example,
the code uses `PtoRequestStatus.APPROVED`, while the interface renders
`Aprobada`.

A full internationalization library is not required for the single-locale MVP.
However, shared domain labels and formatters should be centralized enough to
avoid inconsistent translations.

### Initial terminology

| English code concept | Spanish interface text  |
| -------------------- | ----------------------- |
| Administrator        | Administrador           |
| Supervisor           | Supervisor              |
| Collaborator         | Colaborador             |
| PTO requests         | Solicitudes de ausencia |
| Available balance    | Saldo disponible        |
| Vacation             | Vacaciones              |
| Sick                 | Enfermedad              |
| Personal             | Permiso personal        |
| Other                | Otro                    |
| Draft                | Borrador                |
| Pending              | Pendiente               |
| Approved             | Aprobada                |
| Denied               | Rechazada               |
| Cancelled            | Cancelada               |

Product copy may be refined during interface design, but the same concept must
use the same Spanish term throughout the platform.

## Current organization

The organization structure must be stored as data. Access must not be inferred
from a job title, team name, or hard-coded person.

### Management

| Collaborator   | Position | Initial platform role |
| -------------- | -------- | --------------------- |
| Julio Zeledon  | CTO      | Administrator         |
| Yerlin Marquez | CEO      | Administrator         |

### Supervisors

All supervisors currently report to Yerlin Marquez.

| Collaborator   | Position                                            | Initial platform role |
| -------------- | --------------------------------------------------- | --------------------- |
| Mariana Rivera | Production Process and Quality Assurance Supervisor | Supervisor            |
| Laura Vargas   | Customer Service and Sales Supervisor               | Supervisor            |
| Kenia Romero   | Production Execution Supervisor                     | Supervisor            |

### Customer Service

The Customer Service team reports to Laura Vargas.

| Collaborator | Position                        | Initial platform role |
| ------------ | ------------------------------- | --------------------- |
| Kiria Ruiz   | Customer Service Representative | Collaborator          |

### Production

The Production team reports to Kenia Romero.

| Collaborator  | Position               | Initial platform role |
| ------------- | ---------------------- | --------------------- |
| Hayde Romero  | Production Team Member | Collaborator          |
| Maria Carmona | Production Team Member | Collaborator          |
| Gema Perez    | Production Team Member | Collaborator          |
| Jixi Urbina   | Production Team Member | Collaborator          |

### Nutrition

Nutrition is a separate team responsible for research, strategy, and
partnership development. It currently reports to Yerlin Marquez.

| Collaborator  | Position     | Initial platform role |
| ------------- | ------------ | --------------------- |
| Sofía Aguilar | Nutritionist | Collaborator          |

## Roles and authorization model

The MVP uses three platform roles. Roles grant capabilities; reporting
relationships and team assignments restrict which records a user can access.

### Level 1: Administrator

Administrators can:

- Access all MVP areas.
- Invite, activate, deactivate, and manage users.
- Assign roles, teams, positions, supervisors, and reporting managers.
- Initialize and adjust PTO balances.
- Manage company-wide, team, and targeted calendar events.
- Review PTO requests across the organization.
- Review administrative activity and audit entries.

An administrator cannot remove the organization’s final active administrator
or approve their own PTO request.

### Level 2: Supervisor

Supervisors can:

- View collaborators assigned as their direct reports.
- View their team’s schedules and approved absences.
- Create and manage events for teams they are authorized to supervise.
- Review, approve, or deny PTO requests from their direct reports.
- View operational summaries for their authorized teams.
- Submit and track their own PTO requests.

Supervisors cannot approve their own requests. Yerlin Marquez is the initial
approver for supervisor PTO requests.

### Level 3: Collaborator

Collaborators can:

- View calendar events visible to them.
- View their own schedule and PTO balance.
- Create, edit, submit, or cancel eligible PTO requests.
- View the current status and decision history of their own requests.
- View and maintain the permitted fields of their own profile.

Collaborators cannot access another user’s private profile, balance, schedule,
or PTO request.

### Authorization matrix

| Capability                                      | Administrator | Supervisor | Collaborator |
| ----------------------------------------------- | :-----------: | :--------: | :----------: |
| View own profile, schedule, and PTO             |      Yes      |    Yes     |     Yes      |
| View company-wide and invited events            |      Yes      |    Yes     |     Yes      |
| Submit and track own PTO requests               |      Yes      |    Yes     |     Yes      |
| View direct-report schedules and PTO            |      Yes      |    Yes     |      No      |
| Approve or deny direct-report PTO               |      Yes      |    Yes     |      No      |
| Create and manage authorized team events        |      Yes      |    Yes     |      No      |
| Create company-wide events                      |      Yes      |     No     |      No      |
| Manage users, roles, teams, and reporting lines |      Yes      |     No     |      No      |
| Initialize or adjust PTO balances               |      Yes      |     No     |      No      |
| View all organization records and audit entries |      Yes      |     No     |      No      |

Every protected page, Server Action, Route Handler, and database operation must
authenticate and authorize on the server. Hiding an interface control is not an
authorization mechanism.

## MVP functional scope

### 1. Authentication and account lifecycle

The authentication provider is Clerk.

Requirements:

- Registration is restricted and invitation-only.
- Primary authentication uses Google or email verification codes.
- Administrators and supervisors must use MFA.
- Only invited, active users can access the application.
- Users can sign out and revoke their own active sessions.
- Deactivated users lose access without deleting their historical records.
- Expired invitations can be safely resent.
- Administrators can deactivate a platform account and revoke its sessions.
- Account recovery is handled by the connected Google or email identity.
- Authentication secrets and bootstrap credentials are never committed or
  logged.

Clerk owns authentication identity and session lifecycle. MongoDB remains
authoritative for application roles, status, teams, reporting relationships,
and business data. Each MongoDB user stores the stable Clerk user identifier.
Clerk public metadata must not become the sole source of authorization truth.

The sign-in and account screens, including Clerk-hosted or embedded text and
emails, must be configured in Spanish.

### 2. Initial account bootstrap

The platform requires two distinct bootstrap paths:

1. A non-production developer administrator for local development and
   automated testing.
2. The launch administrators, Julio Zeledon and Yerlin Marquez.

Bootstrap requirements:

- The process is explicit, repeatable, and idempotent.
- It cannot create duplicate users or silently promote arbitrary accounts.
- Bootstrap identities come from environment configuration or a controlled
  seed input, not source-code credentials.
- Non-production bootstrap behavior is disabled in production by default.
- The first production administrator setup has a documented one-time process.
- Running the process creates a safe audit entry without logging passwords,
  codes, session tokens, or provider secrets.
- Seed data can link an existing Clerk identity to the corresponding MongoDB
  user without depending on a mutable email after the link is established.

### 3. User, team, and organization management

Administrators can:

- Invite a user with name, email, position, platform role, team, reporting
  manager, status, and initial PTO balance.
- Edit role, position, team, reporting manager, active status, and PTO balance.
- Resend an invitation and revoke sessions when appropriate.
- Search and filter the directory by name, role, team, and status.
- View a user record without exposing authentication credentials.
- Move collaborators between teams without rewriting historical records.

Rules:

- Email addresses are normalized and unique.
- Clerk identifiers are unique when present.
- Historical records reference stable application user identifiers.
- A user may have a reporting manager without that relationship being inferred
  from their platform role.
- Deactivation preserves PTO, event, and audit history.
- Role or reporting-line changes take effect in authorization immediately.

### 4. Role-aware dashboard

The dashboard displays only information relevant to the authenticated user.

All roles see:

- Upcoming visible events.
- Their own PTO balance.
- Their recent PTO requests and statuses.
- Their own upcoming approved absences.

Supervisors additionally see:

- Pending requests from direct reports.
- Upcoming approved team absences.
- Team-level operational summaries.

Administrators additionally see:

- Organization-wide pending requests and upcoming absences.
- User invitation or setup items requiring attention.
- Organization-level operational summaries.

The dashboard requires Spanish loading, empty, error, and unauthorized states.
Announcements are excluded from the MVP dashboard.

### 5. Calendar and events

Administrators and supervisors can create events with:

- Title and optional description.
- Start and end date/time.
- All-day status.
- Optional location or meeting link.
- Visibility: company-wide, team, or invited users.
- Organizer and invitees.

Rules:

- Supervisors can manage only events they created or events for authorized
  teams.
- Collaborators see only company-wide events and events targeted to their team
  or user account.
- Approved PTO is visible on authorized schedules and calendars without
  exposing private notes.
- Dates are stored in UTC and displayed with `es-CR` and
  `America/Costa_Rica`.
- Calendar controls, day and month names, empty states, and event details are
  rendered in Spanish.

Calendar invitations and external calendar synchronization are outside the
initial MVP.

### 6. PTO balances and requests

The interface refers to this area as **Solicitudes de ausencia**. Internal code
may continue to use the concise `pto` domain name.

#### PTO balance

- An administrator assigns an initial balance when creating a collaborator.
- Existing collaborators receive a manually entered opening balance during
  migration.
- Administrators can make a balance adjustment with a required reason.
- The system must support half-day precision.
- A balance may become negative; insufficient balance is a warning, not a
  submission blocker.
- Balance adjustments and approved-request effects must be auditable.

#### PTO categories

Internal enum values and Spanish labels:

| Code value | Spanish label    |
| ---------- | ---------------- |
| `vacation` | Vacaciones       |
| `sick`     | Enfermedad       |
| `personal` | Permiso personal |
| `other`    | Otro             |

Allowance policies and automatic accrual are intentionally not defined in this
MVP and must not be inferred.

#### PTO request data

A request contains:

- Requesting user.
- Start and end dates.
- Requested duration in increments of `0.5` day.
- Category.
- Optional collaborator note.
- Current status and status history.
- Assigned approver.
- Optional decision note.
- Balance before and after an approved request, when applicable.
- Created and updated timestamps.

The minimum request is `0.5` day. Every duration must be a multiple of `0.5`.

#### PTO workflow

```text
Draft → Pending → Approved
                ↘ Denied
Draft/Pending → Cancelled
```

Rules:

- Users can save and edit a draft before submission.
- Users can cancel their own draft or pending request.
- Submitted collaborator requests route to their assigned supervisor.
- Supervisor requests route to Yerlin Marquez.
- Administrator requests route to another active administrator.
- No user can approve or deny their own request.
- Approvers can act only on requests within their authorized scope.
- The interface warns about overlapping requests and insufficient balances.
- A negative projected balance does not prevent submission or approval.
- Approved requests appear on authorized schedules and calendars.
- Private notes are not exposed through shared calendar views.
- Every submission, approval, denial, cancellation, and balance adjustment
  records the actor and timestamp.

### 7. Basic operational reporting

The MVP includes on-screen summaries for:

- Pending PTO approvals.
- Approved upcoming absences.
- PTO requests by status, category, and date range.
- Current PTO balances, including negative balances.
- Active users by role and team.

Administrators can view organization-wide summaries. Supervisors can view only
authorized teams. File exports, performance scoring, and analytics dashboards
are outside the initial MVP.

### 8. Audit trail

Audit entries are required for:

- User invitations, activation, and deactivation.
- Role, team, and reporting-line changes.
- Session revocation initiated by an administrator.
- PTO opening balances and manual adjustments.
- PTO submission, approval, denial, and cancellation.
- Event creation, update, and deletion.
- Bootstrap or seed operations affecting privileged users.

Audit records store the actor, action, target, timestamp, and safe metadata.
They must never contain passwords, authentication codes, session tokens,
provider secrets, or unnecessarily sensitive employee notes.

## Initial domain model

Detailed schemas belong in implementation tasks. The MVP must support:

| Entity               | Core relationships and responsibilities                      |
| -------------------- | ------------------------------------------------------------ |
| User                 | Clerk ID, role, status, position, manager, team, PTO balance |
| Team                 | Name, purpose, supervisors, members                          |
| PtoRequest           | Requester, approver, category, duration, status history      |
| PtoBalanceAdjustment | User, amount, reason, actor, timestamp                       |
| Event                | Organizer, visibility, teams, invitees, date range           |
| AuditEntry           | Actor, action, target, timestamp, safe metadata              |

Database requirements:

- Unique normalized user email.
- Unique sparse Clerk user identifier.
- Decimal-safe representation for half-day balances and durations.
- Indexes supporting dashboard, calendar, directory, approval queue, request
  history, and audit queries.
- Explicit timestamps on business records.
- Validation schemas for every write.

Announcements should not be included in the initial schema unless required by a
later roadmap task.

## Non-functional requirements

### Security and privacy

- Authenticate and authorize every protected server operation.
- Validate all untrusted input before database access.
- Treat PTO balances, request notes, and decision history as confidential.
- Avoid exposing credentials, provider data, database identifiers, or stack
  traces in the UI.
- Use secure, HTTP-only session cookies through the authentication provider.
- Apply rate limiting or provider protections to authentication and other
  abuse-sensitive operations.
- Require confirmation and recent authentication for sensitive account or role
  changes where supported.

### Accessibility and usability

- Meet WCAG 2.2 AA for supported workflows.
- Support keyboard navigation, visible focus, reduced motion, and accessible
  validation.
- Support desktop and mobile layouts using the project design system.
- Provide clear Spanish feedback for consequential actions.
- Never communicate request status using color alone.

### Reliability and maintainability

- Maintain compatibility with Next.js, MongoDB Atlas, and Netlify.
- Preserve the existing Server Component and server-action architecture.
- Keep client-side JavaScript limited to interactions that require it.
- Use repeatable seeds and migrations instead of manual database edits.
- Make authorization rules testable outside presentation components.
- Log operational failures safely without leaking confidential data.

## MVP development roadmap

The roadmap follows dependency order. Each milestone should be decomposed into
small vertical tasks with its own tests, documentation, and deployable build.

### Milestone 0: Product and technical foundation

Deliverables:

- Confirm the remaining PTO calculation decisions listed below.
- Define English domain enums and their Spanish label mappings.
- Define environment variables for Clerk, MongoDB Atlas, and bootstrap inputs.
- Establish the shared authenticated layout and Spanish navigation map.
- Document seed, migration, and audit conventions.
- Define the authorization policy functions and representative test cases.

Exit criteria:

- Domain terminology is consistent.
- No blocking product ambiguity remains for Milestones 1–3.
- Local, preview, and production environment requirements are documented.

### Milestone 1: Secure access and platform shell

Deliverables:

- Configure Clerk for restricted invitations, Spanish text, Google or email
  codes, and MFA requirements.
- Implement sign-in, sign-out, session retrieval, route protection, and
  unauthorized states.
- Create the application user record linked to a Clerk user.
- Implement safe non-production and launch-administrator bootstrap flows.
- Add server-side role and status checks.
- Replace the reference dashboard navigation with the authenticated Spanish
  application shell.

Exit criteria:

- Invited active users can authenticate.
- Deactivated or unauthorized users cannot access protected pages or
  mutations.
- Julio and Yerlin can be established as administrators without hard-coded
  credentials.
- Authentication and authorization boundary tests pass.

### Milestone 2: Organization administration

Deliverables:

- Implement user directory, user details, invitations, and activation status.
- Implement teams, reporting relationships, and role assignments.
- Seed the current organization structure.
- Implement opening PTO balance entry and audited manual adjustments.
- Add immediate authorization updates after role or reporting-line changes.

Exit criteria:

- An administrator can reproduce the current organization from the UI or
  repeatable seed.
- Supervisors can access only their assigned direct reports.
- Historical records survive user deactivation or team changes.
- Permission and audit tests pass.

### Milestone 3: PTO vertical slice

Deliverables:

- Implement balance display and adjustment history.
- Implement draft, submission, approval, denial, and cancellation workflows.
- Implement half-day validation, approval routing, overlap warnings, and
  negative balances.
- Implement collaborator, supervisor, and administrator PTO views.
- Add audit entries and Spanish feedback for every state transition.

Exit criteria:

- A collaborator can complete the full request journey.
- A supervisor can decide an authorized direct-report request.
- Yerlin can decide a supervisor request.
- An administrator request requires another administrator.
- Unauthorized and self-approval attempts fail on the server.
- Balance calculations and status transitions have automated coverage.

### Milestone 4: Calendar and schedule visibility

Deliverables:

- Implement company, team, and invited-user events.
- Implement Spanish calendar and event-management interfaces.
- Display approved PTO in authorized schedules and calendars.
- Protect private notes and unauthorized event details.

Exit criteria:

- Event audiences see the correct events.
- Supervisors cannot manage events outside their authorized teams.
- Approved absences appear without leaking confidential PTO information.
- Timezone and locale tests cover relevant date boundaries.

### Milestone 5: Dashboard, reporting, and MVP hardening

Deliverables:

- Replace placeholders with role-aware dashboard data.
- Implement scoped operational summaries.
- Complete audit browsing for administrators.
- Complete responsive, accessibility, empty-state, and error-state coverage.
- Review indexes, logging, performance, deployment configuration, and recovery
  documentation.
- Perform end-to-end testing for every critical role journey.

Exit criteria:

- All MVP acceptance criteria pass.
- WCAG checks pass for critical workflows in light and dark themes.
- The production build deploys successfully to Netlify.
- Administrators have documented launch, support, deactivation, and recovery
  procedures.

### Post-MVP candidates

- Company and team announcements.
- Transactional notifications beyond authentication messages.
- External calendar synchronization.
- File and document management.
- PTO accrual automation.
- Payroll or accounting integrations.
- Data exports and advanced analytics.

## MVP acceptance criteria

The MVP is ready for launch when:

1. All rendered product and authentication text is in Spanish.
2. An invited active user can authenticate, use MFA when required, and sign
   out.
3. Deactivated, unauthenticated, and unauthorized users are rejected by direct
   URL access and server mutations.
4. An administrator can manage users, roles, teams, reporting lines, account
   status, and PTO opening balances.
5. The current organization can be created through a repeatable seed or the
   administration interface.
6. Every role sees the correct navigation, dashboard content, and private data.
7. A collaborator can request a half-day absence and can submit a request that
   produces a negative projected balance.
8. Requests route to the correct approver and cannot be self-approved.
9. Authorized approvers can approve or deny a request, and the requester can
   see its history.
10. An authorized user can create an event, and only the intended audience can
    view it.
11. Approved PTO appears on authorized schedules without exposing private
    notes.
12. Sensitive user, permission, balance, PTO, event, and bootstrap changes
    create safe audit entries.
13. Critical authentication, authorization, organization, PTO, calendar, and
    dashboard journeys have automated coverage.
14. Critical workflows meet WCAG 2.2 AA and work on supported mobile and
    desktop layouts.
15. The production build remains deployable to Netlify with documented
    environment configuration.

## Out of scope for the initial MVP

- Public registration or external customer access.
- Company or team announcements.
- Payroll or accounting integrations.
- Automated PTO allowance or accrual calculations.
- Employee performance scoring.
- Native mobile applications.
- Real-time chat.
- File and document management.
- External calendar synchronization.
- Complex multi-step approval chains.
- Email, SMS, or push notifications beyond authentication-related messages.
- File exports and advanced analytics.

## Remaining product decisions

These decisions should become explicit Milestone 0 tasks. They block final PTO
schema and calculation work but do not block authentication setup:

1. Decide whether there is one combined PTO balance or a separate balance for
   each category.
2. Define whether approved requests reduce the balance immediately and how a
   later cancellation restores it.
3. Define how weekends, Costa Rican public holidays, and collaborator work
   schedules affect requested duration.
4. Define whether sick, personal, and other categories always affect the PTO
   balance or can be informational only.
5. Define who approves Yerlin Marquez’s own requests; self-approval remains
   prohibited.

No allowance amount, accrual schedule, blackout date, carryover rule, or payroll
behavior should be inferred until it is approved in a separate product
decision.
