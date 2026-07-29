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
├── src/app/                 Routes, layouts, error states, and Route Handlers
├── src/components/ui/       Reusable, domain-neutral UI primitives
├── src/features/<feature>/  Feature-owned actions, components, data, and schemas
├── src/lib/server/          Server-only shared infrastructure
├── src/styles/              Global CSS tokens and base styles
├── tests/unit/              Unit tests
├── tests/e2e/               Browser and accessibility tests
└── scripts/                 Repeatable maintenance and data-migration scripts
```

Route files compose feature modules. Feature modules own their domain logic;
avoid creating broad `utils` or `helpers` folders.

## Rendering and data access

- Pages and layouts are Server Components unless browser-only behaviour is
  required.
- Keep the `"use client"` boundary as small as possible to minimise client-side
  JavaScript.
- Server Components access server-only data modules directly. Do not call an
  internal Route Handler from a Server Component.
- Server Actions serve UI-triggered form submissions and mutations.
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
employment status, teams, and business data. Authorization must run on the
server and use the stable Clerk user identifier to resolve the corresponding
MongoDB user; client-visible metadata is not an authorization boundary.

For persistence changes, define indexes deliberately and add a repeatable
migration under `web/scripts/` when existing data needs to change.

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
