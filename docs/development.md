# Development guide

## Local setup

Use Node 24 and pnpm 10. Install dependencies in `web/`, then merge settings from
`web/.env.example` into `web/.env.local`. Never overwrite an existing secret file
or commit it. The [main README](../README.md) contains the startup sequence.

Authentication now uses Better Auth with MongoDB, email/password and local Spanish
forms. Configure `BETTER_AUTH_SECRET` (generate with `openssl rand -base64 32`),
`APP_BASE_URL=http://localhost:3000`, `MONGODB_URI`, `MONGODB_DB`,
`SMTP_HOST`, `SMTP_PORT`, `AUTH_EMAIL_FROM`, and SMTP credentials if required.
Use a local capture inbox or test mail provider; do not add a console-token bypass.

Clerk keys are obsolete and may be removed once the migration is verified.
For an existing database follow [the cutover guide](./better-auth-migration.md)
first. Auth index and administrator scripts require the exact database name:

```bash
cd web
pnpm bootstrap:auth colaboradores_dna_dev
pnpm bootstrap:admins colaboradores_dna_dev
pnpm dev
```

Admin bootstrap additionally needs a temporary `BOOTSTRAP_ADMIN_IDENTITIES`
value. It sends an invitation, not a password or automatic login. See
[authentication](./authentication.md) for email verification, MFA and recovery.

Use the canonical localhost hostname during authentication, not a mixture of
localhost and 127.0.0.1. Do not use production credentials in local tests.
Opt-in live auth/PTO tests create disposable databases and require a suitably
isolated test credential; see the main README for commands.

### Employee model bootstrap

After configuring the development Atlas database, initialize the employee
indexes and editable departments:

```bash
cd web
pnpm bootstrap:employee-model
```

The command is idempotent. It creates the employee-domain indexes, inserts
Gerencia, Nutrición, Producción, and Servicio al cliente only when they do not
already exist, and backfills a missing employee `preferredName` to `null`. It
does not create employees, platform accounts, credentials, or invitations.

### Scheduling model bootstrap

After the employee model is initialized, apply the Scheduling-owned indexes with
migration-capable credentials:

```bash
cd web
pnpm bootstrap:scheduling-model
```

The command is idempotent. It reconciles the effective-timeline and
one-open-period indexes for `employee_schedules` and installs moderate dual-read
validation for v1 and v2. It does not create schedules or rewrite unversioned
legacy v1 records, because those records do not contain clock times that can be
safely inferred. Scheduling runtime paths do not need index management
privileges. See [Collaborator scheduling](./scheduling.md).

### Collaborator development

The Desarrollo module is restricted to synthetic data until its governance and
production security gates are approved. Initialize its reviewed collections and
indexes with migration-capable development credentials:

```bash
cd web
pnpm bootstrap:development-model
```

The runtime application account should not receive index-management privileges
in production. Narrative encryption uses the two server-only variables above;
generate a local key with `openssl rand -base64 32`. The metadata-only dashboard
does not need the key, while 1:1 narrative reads and writes fail closed if it is
missing or invalid. Never put the key in a `NEXT_PUBLIC_` variable or an untrusted
Deploy Preview. See the [security boundary](./collaborator-development-security.md).

## Daily workflow

1. Create or update a focused feature under `src/features/`.
2. Compose it from the appropriate route under `src/app/`.
3. Add unit tests for deterministic logic.
4. Add or update a Playwright flow when user-visible behaviour changes.
5. Run the quality checks before requesting review.

## Checks

Run from `web/`:

```bash
pnpm lint
pnpm stylelint
pnpm typecheck
pnpm test
pnpm build
pnpm verify
pnpm test:e2e
```

`pnpm verify` combines formatting, linting, CSS validation, type checking,
unit tests, and a production build. Playwright tests remain separate because
they require a browser runtime.

## Adding a MongoDB feature

1. Configure a non-production Atlas database and least-privilege database
   user.
2. Add its values to `web/.env.local`.
3. Validate input with a feature-owned Zod schema.
4. Access the database through `src/lib/server/mongodb.ts`.
5. Define any required indexes and add a repeatable bootstrap or migration in
   `web/scripts/`; do not make runtime schema-administration privileges a feature
   dependency.
6. Test the feature against the non-production database only.
