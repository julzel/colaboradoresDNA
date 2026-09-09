# Colaboradores DNA

Full-stack employee platform built with Next.js, React, TypeScript, **Better Auth**,
MongoDB Atlas, and Netlify. Application code lives in [web/](./web); project
documentation lives in [docs/](./docs).

## Start locally

Requires Node.js 24, pnpm 10, MongoDB Atlas (or a replica set), and an SMTP
provider or local email capture server.

1. Run `pnpm install --frozen-lockfile` from `web/`.
2. Copy `web/.env.example` to `web/.env.local` only if the latter does not exist.
   Otherwise merge the new settings without overwriting existing secrets.
3. Configure `MONGODB_URI`, `MONGODB_DB`, `APP_BASE_URL=http://localhost:3000`,
   `BETTER_AUTH_SECRET`, and the SMTP settings. Generate the auth secret with
   `openssl rand -base64 32`; keep it server-only and independent per environment.
4. Initialize the authentication schema using the **exact configured database name**:

```bash
cd web
pnpm bootstrap:auth colaboradores_dna_dev
pnpm bootstrap:employee-model
pnpm bootstrap:scheduling-model
pnpm bootstrap:pto-model
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Use this canonical hostname
consistently; `127.0.0.1` is not interchangeable for authenticated requests.

There is no public administrator signup. To create the first administrator, set
`BOOTSTRAP_ADMIN_IDENTITIES` temporarily as described in the
[authentication guide](./docs/authentication.md#first-administrator), then run
`pnpm bootstrap:admins colaboradores_dna_dev`. The administrator receives an
invitation, creates a password, verifies their email, and enrolls an authenticator.

**Existing Clerk database?** Follow the
[Better Auth migration guide](./docs/better-auth-migration.md) before bootstrapping.
Do not delete employee records or leave balances. Existing accounts must be
re-invited; Clerk passwords, MFA factors, sessions, and avatars are not imported.

## Authentication

- Invitation-only email/password registration; verified email required.
- Mandatory authenticator-app MFA for administrators and supervisors, optional
  for collaborators; one-time recovery codes.
- Password recovery, password changes, and session management at
  `/account/security`.
- Server-side application roles and active status remain in `platform_users`.
- Better Auth exposes same-origin HTTP endpoints under `/api/auth/*`.
  Business services use a provider-neutral authorization boundary.
- Clerk keys and a Clerk production subscription are no longer required.
  SMTP delivery and operating authentication securely are now our responsibility.

See [implementation and security](./docs/authentication.md) and
[cutover, testing, and rollback](./docs/better-auth-migration.md).

## Quality checks

Run from `web/`:

```bash
pnpm verify          # format, lint, styles, types, default tests, build
pnpm test:e2e        # browser and accessibility checks
pnpm test:coverage
```

Opt-in integration tests create and delete uniquely named disposable databases;
they never target `MONGODB_DB` for test data. Use a dedicated test Atlas credential:

```bash
RUN_AUTH_LIVE=1 node --env-file=.env.local node_modules/vitest/vitest.mjs run tests/integration/better-auth-mongodb.test.ts
RUN_PTO_LIVE=1 node --env-file=.env.local node_modules/vitest/vitest.mjs run tests/integration/pto-mongodb.test.ts
```

Auth integration tests capture emails in memory; they do not send real email.
See the [repository audit](./docs/repository-audit-2026-09-07.md) for earlier
findings; its Clerk-specific configuration is superseded by this migration.

## Production deployment

Follow the [deployment checklist](./docs/deployment.md). Netlify settings:
base directory `web`, build command `pnpm build`, publish directory `.next`,
Node 24. Select the reviewed release branch in Netlify's build settings; the
repository does not select it automatically.

For the production site use
`APP_BASE_URL=https://colaboradores.dnaturefood.com`,
`APP_ENVIRONMENT=production`, a dedicated production database, a unique
`BETTER_AUTH_SECRET`, and verified TLS SMTP delivery. Configure variables for
Builds and Functions. Keep production secrets out of Deploy Previews.

Do not cut over until email delivery, MFA recovery, account deactivation, and the
collaborator → administrator leave workflow pass on staging. Deploying this code
does not automatically migrate existing data, send invitations, or clear databases.

## Feature initialization

After verifying the target environment, additional idempotent model bootstraps
are available:

```bash
pnpm bootstrap:production-tasks-model -- --dry-run
pnpm bootstrap:production-tasks-model
pnpm bootstrap:development-model
```

The collaborator-development feature needs independent server-only encryption
keys for narrative records. Preserve old key versions and back them up separately.
A new employee receives an opening PTO balance during creation; existing
employees need an explicit opening balance under **Saldo de ausencias**.
Missing and zero balances are intentionally different.

## Documentation

- [Architecture](./docs/architecture.md)
- [Authentication and account lifecycle](./docs/authentication.md)
- [Better Auth migration](./docs/better-auth-migration.md)
- [Development guide](./docs/development.md)
- [Deployment guide](./docs/deployment.md)
- [Design system](./docs/design-system.md)
- [Employee model](./docs/employee-model.md)
- [Collaborator scheduling](./docs/scheduling.md)
- [Production tasks](./docs/production-tasks.md)
- [Collaborator development security](./docs/collaborator-development-security.md)
- [Management prioritization prototype](./docs/management-prioritization-prototype.md)

## Repository layout

```text
.
├── docs/       Project documentation
├── tasks/      Product and technical decisions (historical decisions may mention Clerk)
└── web/        Next.js application, tests, and deployment configuration
```
