# Technical Stack Decision

**Status:** Approved  
**Decision date:** 2026-07-28  
**Application directory:** `/web`

## Decision summary

The project will use a full-stack Next.js application deployed to Netlify, with
MongoDB Atlas as its managed database.

This stack meets the requirements for server-side rendering, static generation,
responsive design, accessibility, performance, scalability, and maintainability.
Netlify's current OpenNext adapter fully supports the Next.js features required
by this project, including the App Router, SSR, SSG, ISR, React Server
Components, Server Actions, Route Handlers, streaming, and image optimization.

Only stable releases are approved. Canary, preview, release-candidate, and
experimental dependencies must not be used in production without a separate
technical decision.

## Approved core stack

| Area | Selection | Approved baseline | Decision |
| --- | --- | --- | --- |
| Language | TypeScript | Latest stable compatible 5.x release | Use strict mode throughout the application. |
| Runtime | Node.js | 24.x LTS | Matches Netlify's current default and exceeds Next.js 16's Node.js 20.9 minimum. |
| Package manager | pnpm | 10.x | Fast, deterministic installs with a committed lockfile. |
| Web framework | Next.js App Router | 16.2.12 | Latest stable Next.js release as of the decision date. |
| UI runtime | React and React DOM | 19.2.7 | Latest stable React release as of the decision date. |
| Styling | Native CSS and CSS Modules | Built into Next.js | No Tailwind or runtime CSS-in-JS. |
| Backend | Server Components, Server Actions, and Route Handlers | Built into Next.js | Keep server and client code in one typed application. |
| Database | MongoDB Atlas | M0 Free for development and testing | Use a separately sized Atlas deployment for production after load testing. |
| Database driver | Official `mongodb` Node.js driver | 7.5.0 | Prefer the lightweight native driver over an ODM initially. |
| Deployment | Netlify with its automatic OpenNext adapter | Current managed adapter | Do not install or pin the Netlify adapter manually. |

Versions above are a dated baseline, not permission to ignore security patches.
The lockfile is the reproducible source of truth. Patch updates should be applied
promptly after the verification suite passes; minor and major updates require a
Deploy Preview and review of framework and platform release notes.

## Application architecture

Use the Next.js App Router exclusively.

- Pages and layouts are React Server Components by default.
- Add `"use client"` only at the smallest boundary that needs browser APIs,
  event handlers, or local interactive state.
- Read MongoDB directly from Server Components or server-only data-access
  modules. Do not call an internal HTTP endpoint from a Server Component.
- Use Server Actions for first-party form submissions and UI-triggered
  mutations.
- Use Route Handlers under `src/app/api/**/route.ts` for webhooks, public HTTP
  APIs, file responses, health checks, or consumers outside the Next.js UI.
- Every Server Action and Route Handler must independently validate input,
  authenticate the caller when authentication exists, and authorize the
  requested operation. A Server Action is a public server entry point, not a
  trusted function call.
- Use the Node.js runtime for all code that accesses MongoDB. Do not move the
  MongoDB driver into an Edge runtime.
- Revalidate affected paths or tags after successful mutations instead of
  forcing broad dynamic rendering.

## Database decision

Use the official MongoDB Node.js driver instead of Mongoose for the initial
implementation. This keeps the runtime and dependency surface small while
retaining full MongoDB functionality and native TypeScript support.

Add Mongoose only if the application later demonstrates a strong need for
document middleware, model inheritance, or a shared ODM abstraction that
outweighs its additional complexity.

Database implementation requirements:

- Keep all database code server-only.
- Store the Atlas URI in `MONGODB_URI` and the database name in `MONGODB_DB`.
  Neither variable may use the `NEXT_PUBLIC_` prefix.
- Create one module-scoped `MongoClient` connection promise and reuse it across
  warm function invocations. Do not open a new connection per query.
- Configure MongoDB Stable API v1.
- Use a conservative connection pool for the Atlas M0 tier and tune it using
  observed concurrency before production. Atlas connection limits must be
  monitored.
- Validate all external input with Zod before it reaches the database.
- Keep runtime validation schemas close to their domain feature and infer
  TypeScript types from them where practical.
- Define indexes intentionally and review queries with `explain` when a
  collection or traffic volume grows.
- Use MongoDB collection validators for important stored-data invariants.
- Keep repeatable, versioned data migration scripts under `web/scripts/`.
- Use separate databases or clusters and least-privilege database users for
  local development, Deploy Previews, testing, and production.
- Choose an Atlas region close to the Netlify function region to reduce latency.

Atlas requires an IP access-list entry for every client connection. Netlify
function egress must therefore be covered by the Atlas network policy. A broad
`0.0.0.0/0` entry may make early development possible when fixed egress is not
available, but it removes network-level source restriction and is not the
preferred production posture. If it is temporarily used, require TLS, a unique
least-privilege database user, a strong rotated password, and monitoring. Use
fixed egress or private connectivity for production when the selected Netlify
and Atlas plans support it.

## State management

Do not add Redux, Zustand, or a client-side server-state cache by default.

Use, in order:

1. Server Components for server-owned data.
2. URL search parameters for shareable navigation and filter state.
3. React component state for local UI state.
4. React context for small, stable, subtree-scoped state.

Zustand is the approved first option only if genuinely shared, frequently
changing client-only state emerges, such as a multi-step editor or complex
workspace state. Redux Toolkit is reserved for cases that specifically need
reducer-driven workflows, strict event auditing, or its broader middleware and
debugging ecosystem.

TanStack Query may be added only when a feature requires substantial
client-side polling, optimistic caching, or synchronization that Server
Components and Server Actions do not cover cleanly.

## Styling and component library

Use native CSS with:

- `src/styles/globals.css` for resets, design tokens, typography, and global
  element defaults.
- Co-located `*.module.css` files for component styles.
- CSS custom properties for color, spacing, typography, elevation, motion, and
  breakpoints.
- Mobile-first layouts built with Grid, Flexbox, container queries, logical
  properties, and fluid sizing such as `clamp()`.
- Semantic HTML as the default; ARIA supplements semantics and does not replace
  them.
- Visible keyboard focus, sufficient contrast, touch targets, and
  `prefers-reduced-motion` support in the component-library baseline.

Do not add Tailwind, Sass, styled-components, Emotion, or a general-purpose UI
framework without a new decision. Small focused packages may be used when they
solve an accessibility-heavy primitive that is unsafe or inefficient to
reimplement.

## Validation and supporting libraries

Approved baseline dependencies:

- `zod` for validation at Server Action, Route Handler, environment, and
  persistence boundaries.
- `server-only` to make server-only modules fail fast if imported by client
  code.
- `clsx` only if conditional class composition becomes difficult to read with
  native expressions.

Authentication, transactional email, analytics, error monitoring, and file
storage are intentionally undecided because their requirements are not part of
this task. They must not be selected solely because they are popular.

## Testing strategy

Use one tool per testing level:

| Level | Tools | Scope |
| --- | --- | --- |
| Unit | Vitest | Pure functions, validation, mapping, and data-access logic with boundaries mocked. |
| Component | Vitest, React Testing Library, `@testing-library/jest-dom`, and `@testing-library/user-event` | Synchronous Client Components and accessible user interactions. |
| End-to-end | Playwright | Critical flows, async Server Components, Server Actions, Route Handlers, and production-like navigation. |
| Accessibility automation | `@axe-core/playwright` | Automated WCAG A/AA checks on representative pages and interactive states. |

Prefer end-to-end coverage for async Server Components because current unit
test tools do not fully support them. Automated accessibility checks must be
supplemented by keyboard, screen-reader, zoom, contrast, and reduced-motion
manual checks.

Do not install Jest and Cypress alongside this baseline; maintaining duplicate
unit and browser-test runners would add cost without additional coverage.

## Code quality

Use:

- ESLint flat configuration with Next.js Core Web Vitals, TypeScript, React
  Hooks, and JSX accessibility rules.
- Prettier for deterministic formatting.
- Stylelint with a standard CSS configuration for native CSS quality.
- TypeScript `strict: true`, `noUncheckedIndexedAccess: true`, and
  `exactOptionalPropertyTypes: true`.

Next.js 16 no longer runs linting as part of `next build`, so linting and type
checking must remain explicit scripts and deployment gates.

Required scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "format:check": "prettier --check .",
    "verify": "pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build"
  }
}
```

## Project structure

All application code, dependencies, configuration, tests, scripts, and generated
build output belong under `/web`. Do not place `package.json`, framework
configuration, test configuration, environment files, or application source in
the repository root.

```text
web/
├── .env.example
├── .gitignore
├── .nvmrc
├── eslint.config.mjs
├── netlify.toml
├── next.config.ts
├── package.json
├── playwright.config.ts
├── pnpm-lock.yaml
├── prettier.config.mjs
├── public/
├── scripts/
├── src/
│   ├── app/
│   │   ├── api/
│   │   ├── global-error.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   └── ui/
│   ├── features/
│   │   └── <feature>/
│   │       ├── actions/
│   │       ├── components/
│   │       ├── data/
│   │       └── schemas/
│   ├── lib/
│   │   └── server/
│   │       └── mongodb.ts
│   └── styles/
│       └── globals.css
├── stylelint.config.mjs
├── tests/
│   ├── e2e/
│   └── unit/
├── tsconfig.json
└── vitest.config.mts
```

The structure is domain-oriented: route files compose features, reusable visual
primitives live in `components/ui`, and domain logic lives in `features`.
Avoid generic dumping-ground directories such as `utils` or `helpers`; name
modules after the capability they provide.

## Netlify configuration

Netlify should be connected to the Git provider and configured as follows:

| Setting | Value |
| --- | --- |
| Base directory | `web` |
| Build command | `pnpm verify` |
| Publish directory | `.next` or the value automatically detected by Netlify |
| Node.js version | `24`, also pinned by `web/.nvmrc` |
| Package manager | Version pinned by the `packageManager` field in `web/package.json` |

`web/netlify.toml` may contain non-secret, site-specific build configuration.
Do not put secrets in that file. Because the Netlify base directory is `web`,
Netlify can find the configuration without a root-level `netlify.toml`.

Let Netlify detect and manage its OpenNext adapter. Do not add the adapter to
`package.json` and do not pin its version. Enable
`NETLIFY_NEXT_SKEW_PROTECTION=true` to reduce errors for users who remain on the
site while a new deployment is activated.

Set `MONGODB_URI`, `MONGODB_DB`, and other secrets in the Netlify UI, CLI, or
API, with distinct contextual values for Production and Deploy Previews. Values
used while prerendering must be available to Builds; values needed by SSR,
Server Actions, and Route Handlers must be available to Functions at runtime.
Mark secrets as sensitive where the Netlify plan supports that control.

## Responsive design, accessibility, and performance gates

The stack supports these concerns, but they still require implementation and
verification.

- Target WCAG 2.2 AA.
- Every page must have a unique title and one descriptive primary heading.
- All functionality must be operable by keyboard with logical focus order.
- Test layouts at narrow, medium, wide, zoomed, and content-stress sizes rather
  than only at named device widths.
- Prefer static rendering and caching. Use dynamic rendering only when request
  data or freshness requirements demand it.
- Keep Client Components and third-party browser JavaScript minimal.
- Use `next/image`, `next/font`, route-level code splitting, and Suspense/loading
  states.
- Track Core Web Vitals and prevent regressions.
- Run Lighthouse against a production build and require a score of at least 90
  for Performance, Accessibility, Best Practices, and SEO on representative
  pages, allowing a documented exception only when field data gives a more
  accurate result.
- Review bundles when a new dependency materially increases client JavaScript.

## Delivery acceptance criteria

This decision is correctly implemented when:

- All application and tool files are under `/web`.
- The application builds using the pinned Node.js and pnpm versions.
- `pnpm verify` passes.
- Playwright critical-path and accessibility tests pass against a production
  build.
- A Netlify Deploy Preview successfully renders an SSR page, performs a Server
  Action, calls a Route Handler, and reads/writes the non-production Atlas
  database.
- No Atlas URI, password, or other secret appears in source control, browser
  bundles, or build artifacts.
- Netlify function logs show connection reuse without exhausting the Atlas
  connection limit.
- The production network-access approach for Atlas is explicitly reviewed
  before launch.

## Sources

- [Next.js 16.2 release and current stable line](https://nextjs.org/blog/next-16-2)
- [Next.js package releases](https://www.npmjs.com/package/next?activeTab=versions)
- [Next.js installation and runtime requirements](https://nextjs.org/docs/app/getting-started/installation)
- [React versions](https://react.dev/versions)
- [Netlify support for Next.js](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/)
- [Netlify monorepo and subdirectory configuration](https://docs.netlify.com/build/configure-builds/monorepos/)
- [Netlify build software versions](https://docs.netlify.com/build/configure-builds/available-software-at-build-time/)
- [Netlify environment variables](https://docs.netlify.com/build/environment-variables/overview/)
- [MongoDB's Next.js integration guide](https://www.mongodb.com/docs/drivers/node-frameworks/next-integration/)
- [MongoDB Node.js driver releases](https://www.npmjs.com/package/mongodb?activeTab=versions)
- [MongoDB Atlas connection requirements](https://www.mongodb.com/docs/atlas/driver-connection/)
- [MongoDB Atlas IP access lists](https://www.mongodb.com/docs/atlas/security/add-ip-address-to-list/)
- [MongoDB Stable API](https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/stable-api/)
- [Next.js testing guidance](https://nextjs.org/docs/app/guides/testing)
- [Next.js production checklist](https://nextjs.org/docs/app/guides/production-checklist)
- [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing)
