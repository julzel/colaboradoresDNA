# Architecture

## Overview

Colaboradores DNA is a single full-stack Next.js application. It uses the App
Router and React Server Components by default, with Clerk as the identity and
session provider, MongoDB Atlas as the document database, and Netlify as the
hosting platform.

```text
Browser
  │
  ▼
Next.js App Router
  ├── Clerk proxy and provider: identity and session lifecycle
  ├── Server Components: read and render data
  ├── Server Actions: first-party mutations
  └── Route Handlers: public HTTP and webhook endpoints
          │
          ▼
     MongoDB Node.js driver
          │
          ▼
      MongoDB Atlas
```

## Application layout

All executable application code and configuration live under `web/`.

```text
web/
├── config/clerk/           Versioned non-secret instance and email configuration
├── scripts/                Controlled bootstrap and maintenance operations
├── src/app/                 Routes, layouts, error states, and Route Handlers
├── src/components/ui/       Reusable, domain-neutral UI primitives
├── src/features/<feature>/  Feature-owned application contracts, domain,
│                            integrations, infrastructure, and presentation
├── src/lib/server/          Server-only shared infrastructure
├── src/styles/              Global CSS tokens and base styles
├── tests/unit/              Unit tests
├── tests/e2e/               Browser and accessibility tests
└── scripts/                 Repeatable maintenance and data-migration scripts
```

Route files compose feature modules. Feature modules own their domain logic;
avoid creating broad `utils` or `helpers` folders.

Application DTOs are transport-neutral and contain no localized display labels,
React types, framework navigation, or persistence values. UI-facing DTOs live in
`view-models/` (or `domain/` when they are true domain types), never in repository
modules. A presentation adapter maps application results into those view models;
repositories and use cases do not depend on the presenter.

Cross-feature behavior uses explicit interfaces under `integrations/`. The
consuming feature owns the port and its narrow DTOs; the providing feature owns
the adapter that translates its domain and service results into that contract.
Feature services depend on those ports instead of importing another feature's
service or repository directly. Provider-specific models stay behind the
adapter, including the Calendar/PTO, Calendar/Development, and PTO/Scheduling
interactions.

## Rendering and data access

- Pages and layouts are Server Components unless browser-only behaviour is
  required.
- Keep the `"use client"` boundary as small as possible to minimise client-side
  JavaScript.
- Route-level Server Components access data through feature query or service
  modules. Repository and backend-provider clients remain behind those modules.
  Do not call an internal Route Handler from a Server Component.
- ESLint prevents route modules and feature components from importing repository
  modules directly, including through relative paths.
- Server Actions serve UI-triggered form submissions and mutations. They parse
  transport input, call one feature use case, and translate its result into UI
  state, cache invalidation, or navigation. Authorization, repositories,
  provider clients, and multi-step business orchestration remain in the use
  case or service layer.
- Route Handlers serve webhooks, integrations, health checks, and external HTTP
  consumers.
- MongoDB access must use `src/lib/server/mongodb.ts`; never expose an Atlas
  URI or database driver to browser code.

## Data safety

Every Server Action and Route Handler must:

1. Validate untrusted input with Zod.
2. Authenticate the caller when the feature requires identity.
3. Authorize the requested action.
4. Return only data appropriate for that caller.

Clerk owns identity and session lifecycle. MongoDB owns application roles,
employment status, departments, and business data. Authorization must run on
the server and use the stable Clerk user identifier to resolve the corresponding
MongoDB user; client-visible metadata is not an authorization boundary.

`requirePlatformUser()` is the shared server boundary for private resources. It
denies users without a MongoDB invitation, inactive users, privileged roles
without MFA, and callers outside a resource's allowed roles. Every future page,
Server Action, and Route Handler must still invoke the boundary itself.

For persistence changes, define indexes deliberately and add a repeatable
migration under `web/scripts/` when existing data needs to change.

## Employee domain

Authentication and employee data use separate records:

- `platform_users` owns login email, Clerk linkage, platform role, invitation,
  and access status.
- `employees` owns legal/personal names, birthday day and month, identification,
  optional phone number, and employment lifecycle.
- `departments` contains editable organizational departments.
- `employee_assignments` preserves effective-dated department, position, and
  reporting relationships.
- The dedicated Scheduling slice owns `employee_schedules` and preserves
  effective-dated one- or two-week work patterns.
- `employee_audit` records safe action names and changed field names without
  copying sensitive values.

Employee creation and effective-timeline writes use MongoDB transactions.
Timeline lock documents serialize assignment graph and per-employee schedule
changes so application-level overlap and reporting-cycle checks remain valid
under concurrent requests.

## Scheduling domain

`src/features/scheduling/` owns collaborator work-pattern validation,
effective-dated schedule persistence, schedule resolution, and neutral date-range
calculations. The canonical v2 model stores exact same-day `HH:mm` shifts in an
anchored one- or two-week cycle. Existing unversioned schedules remain readable
as legacy v1 records, but their unknown clock times are never fabricated.

Scheduling exposes authorized server services rather than persistence objects.
Administrators can write and read schedules for collaborators; a collaborator's
read service derives its target employee from the authenticated identity and is
read-only. Future scheduler interfaces must depend on serializable domain or
view-model contracts, not MongoDB documents.

PTO owns the port through which it requests schedule-derived leave facts, and
Scheduling owns the adapter. The neutral Scheduling calculation returns working
dates and scheduled minutes without deciding balance units or holiday policy.
See [Collaborator scheduling](./scheduling.md) for the model, compatibility,
authorization, and leave-duration contracts.

Scheduling index creation runs through the repeatable migration bootstrap, not
the runtime repository. This keeps schema-administration privileges out of the
Scheduling runtime path.

## Production tasks domain

`src/features/production-tasks/` owns weekly production plan revisions, tasks,
completion activity, assignment-change indications, canonical areas, reusable
patterns, and the secure XLSX import/export boundary. Published plans are visible
to every active authenticated user; drafts, imports, and management operations
require supervisor or administrator authorization.

The slice stores internal employee IDs and integrates through redacted Employee,
Scheduling, and PTO ports. Its application layer exposes transport-neutral result
DTOs through one public server entry point. The original Tasks UI has been
removed; there are currently no Tasks routes, navigation entries, components,
Server Actions, or view models. A future presentation adapter will own localized
labels, formatted dates, board grouping, transport handling, and navigation. The
application core cannot import presentation code. Workbook commits, audits, and
preview consumption are transactional. See
[Production tasks](./production-tasks.md) for lifecycle, security limits, setup,
and recovery procedures.

## Styling and accessibility

The UI uses native CSS:

- `src/styles/globals.css` defines tokens, global defaults, and layout helpers.
- Components use co-located `*.module.css` files.
- Layouts are mobile-first and use Grid, Flexbox, logical properties, and
  responsive sizing.
- Semantic HTML, keyboard access, focus visibility, contrast, and reduced
  motion are baseline requirements.

## Testing layers

| Layer         | Tool                     | Purpose                                     |
| ------------- | ------------------------ | ------------------------------------------- |
| Unit          | Vitest                   | Pure logic, validation, and data mapping    |
| Component     | Vitest + Testing Library | Isolated interactive Client Components      |
| End-to-end    | Playwright               | Critical journeys and server-rendered flows |
| Accessibility | Playwright + axe         | Automatically detectable WCAG A/AA issues   |
