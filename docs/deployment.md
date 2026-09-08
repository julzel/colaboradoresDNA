# Deployment guide

## Production release

Production builds are now supported explicitly with `APP_ENVIRONMENT=production`.
The existing development site stays in development mode by default. The development
site instructions below apply only to that site, not to a new production site.

Create a separate Netlify production site using base `web`, publish `.next`,
Node 24 and `pnpm build`. Select the reviewed release branch in Netlify.
Configure these variables in the Production context through Netlify settings:

| Variable                                    | Production requirement                              | Scope                |
| ------------------------------------------- | --------------------------------------------------- | -------------------- |
| `APP_ENVIRONMENT`                           | `production`                                        | Builds and Functions |
| `APP_BASE_URL`                              | Final public HTTPS origin, with no path             | Builds and Functions |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`         | Production `pk_live_` key                           | Builds and Functions |
| `CLERK_SECRET_KEY`                          | Matching production `sk_live_` secret               | Builds and Functions |
| `MONGODB_URI`                               | Dedicated production Atlas connection               | Builds and Functions |
| `MONGODB_DB`                                | Dedicated production database name                  | Builds and Functions |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`             | `/sign-in`                                          | Builds and Functions |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL`             | `/sign-up`                                          | Builds and Functions |
| `DEVELOPMENT_ENCRYPTION_ACTIVE_KEY_VERSION` | Active HR encryption key version                    | Functions            |
| `DEVELOPMENT_ENCRYPTION_KEY_V1`             | Independent 32-byte base64 secret when v1 is active | Functions            |

Here `DEVELOPMENT_ENCRYPTION_*` refers to the collaborator-development feature,
not the deployment environment. Preserve old key versions when rotating keys.
Back up keys separately from Atlas and verify restoration before storing real HR
narratives. Never copy development encryption keys into production.

Do not expose production secrets to previews. If previews are enabled, give them
explicit `APP_ENVIRONMENT=development`, Clerk test keys and an isolated database.
The build rejects production mode in preview contexts, mixed Clerk key modes,
development database names, invalid canonical URLs and leftover admin bootstrap
variables. Database names and key prefixes are configuration checks, not proof
of database isolation or credential validity.

Before release:

1. Run `pnpm install --frozen-lockfile`, `pnpm verify` and `pnpm audit` in `web`.
   Run `pnpm test:e2e` against a trusted test environment. Opt-in live tests are
   not included in the default unit suite.
2. Configure Clerk's production domain/DNS, invitation-only access, recovery,
   administrator MFA and session policy. Confirm the production instance is ready
   in Clerk's dashboard.
3. Configure Atlas network access, least-privilege runtime credentials, a separate
   migration user and backups; verify a restore. Use a replica set/Atlas cluster
   because leave balances and other workflows require transactions.
4. With migration credentials targeting the verified production database, run the
   employee, scheduling, PTO, development and production-task model bootstraps.
   Review production-task dry-run output first. Scripts currently load `.env.local`;
   use a protected release workstation and verify the target before execution.
   Bootstrap administrators once and remove bootstrap variables afterwards.
5. On staging, complete collaborator submission → administrator approval/denial →
   collaborator refresh, cancellation, duplicate submission and balance checks.
   The previous audit's two-account browser acceptance remains a release gate.
6. After deployment, verify sign-in/out, invitation redirects, protected routes,
   mobile views, PWA installation/offline recovery and `/sw.js` headers. Inspect
   function errors and set up error/availability alerts.
7. Record the released commit, previous deploy and database/key backup references.
   Roll back the Netlify deploy if smoke checks fail; do not automatically reverse
   database migrations or remove encryption keys.

The planning route is still an optional prototype. Its hidden navigation item is
not an access toggle. If using it, configure its server-only API key and a model
available to your API project, and complete an approved-data/cost review first.

Provider references: [Clerk production setup](https://clerk.com/docs/guides/development/deployment/production)
and [Netlify function environment scopes](https://docs.netlify.com/build/functions/environment-variables/).

## PWA behavior and verification

The root `PwaInstallProvider` captures installation events on public pages and
retains them during client navigation into the workspace. Its header button uses
that shared state; iOS users receive home-screen installation instructions.

The worker registers only in production builds. Use `pnpm build` followed by
`pnpm start` (or the HTTPS Netlify deployment) for browser verification.
`pnpm dev` intentionally does not register it.

Cache policy is implemented in `web/public/sw.js`:

- Content-hashed Next.js chunks use cache-first reads.
- Icons, images and the offline page use cached reads with background HTTP
  revalidation, so asset updates do not require changing the worker version.
- Online document navigations refresh the offline fallback. Private pages,
  API responses and mutations are not stored in the worker cache.
- Cache schema changes use a new `colaboradores-dna-` version. Activation removes
  only older caches with that prefix, preserving other same-origin caches.

Netlify serves `/sw.js` as a public asset, so `web/netlify.toml` declares its
JavaScript content type, `nosniff`, no-store cache policy and worker CSP directly.
The Next.js header configuration supplies the equivalent worker CSP/cache policy
when self-hosting. After deployment, verify the actual `/sw.js` response headers,
worker activation, offline fallback and Retry, then test installation and
standalone authentication on the target phones. A local build does not verify
Netlify's deployed headers.

## Netlify development-site setup

Connect the repository to Netlify and configure the project with these build
settings:

| Setting           | Value        |
| ----------------- | ------------ |
| Site/package      | `web`        |
| Base directory    | `web`        |
| Build command     | `pnpm build` |
| Publish directory | `.next`      |
| Node version      | `24`         |

`web/netlify.toml` records these settings, enables Next.js skew protection, and
explicitly enables Netlify's Next.js runtime. The runtime handles
server-rendered pages, Route Handlers, Server Actions, caching, public assets,
and image optimisation. Keeping the runtime in `devDependencies` prevents a
successful build from publishing the raw `.next` directory as a static site.

The repository is configured as a development-only Netlify site:

- Netlify's `production` context deploys `mvp/main` to the stable development
  URL. The context name is Netlify terminology and does not make this an
  application production environment.
- Pull-request Deploy Previews are supported.
- Other branch deploys are cancelled.
- The build guard allows only `production` and `deploy-preview` contexts and
  requires Clerk development keys plus a non-production MongoDB configuration.

In Netlify, set `mvp/main` as the production branch, enable Deploy Previews for
pull requests if desired, and leave other branch deploys disabled. Require
approval before exposing secrets to previews from untrusted contributors. A
real production release requires a separate configuration and credential review.

## Environment variables

Set secrets in the Netlify UI, CLI, or API rather than committing them to the
repository.

Create these values for both the **Production** and **Deploy Previews** contexts:

| Variable                            | Scopes               | Development value                                  |
| ----------------------------------- | -------------------- | -------------------------------------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Builds and Functions | Clerk development key beginning with `pk_test_`    |
| `CLERK_SECRET_KEY`                  | Builds and Functions | Matching development key beginning with `sk_test_` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`     | Builds and Functions | `/sign-in`                                         |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL`     | Builds and Functions | `/sign-up`                                         |
| `MONGODB_URI`                       | Builds and Functions | Non-production Atlas connection string             |
| `MONGODB_DB`                        | Builds and Functions | Isolated development database name                 |

Variables required while a page is prerendered need the Builds scope. Variables
used by SSR, Server Actions, and Route Handlers need the Functions scope.
Mark `CLERK_SECRET_KEY` and `MONGODB_URI` as secret. Do not mark
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` as secret because it is intentionally
included in browser assets.

The collaborator-development module has a separate application-encryption
boundary. Configure these **Functions-only** secrets solely in a trusted,
synthetic-data environment when testing encrypted records:

| Variable                                    | Purpose                                       |
| ------------------------------------------- | --------------------------------------------- |
| `DEVELOPMENT_ENCRYPTION_ACTIVE_KEY_VERSION` | Active version identifier, initially `v1`     |
| `DEVELOPMENT_ENCRYPTION_KEY_V1`             | Base64-encoded, random 32-byte encryption key |

Generate a development key with `openssl rand -base64 32`. Never commit the
value, expose it to the browser, store it in MongoDB, or provide it to an
untrusted Deploy Preview. The module shell can render without this key; any
operation that encrypts or decrypts a development narrative fails closed when
the key is absent or invalid. A real production environment requires a
separate managed-key, backup-recovery, rotation, and access review before it
may contain HR data.

For this site, set `APP_BASE_URL` in the Netlify **Production** context to
`https://colaboradoresdna.netlify.app` with the Functions scope. Remove any
Production value that points to `localhost`. The invitation service also uses
Netlify's HTTPS request and site URL at runtime, so Deploy Preview invitations
continue to use their preview URL. Set `APP_BASE_URL` explicitly when a custom
domain becomes the intended invitation destination.

## Clerk development checklist

Before the first deployment:

1. Add Clerk development credentials to both Netlify contexts. Never add
   `pk_live_` or `sk_live_` credentials to this site.
2. Configure the allowed sign-in methods, invitation-only registration, account
   recovery, and Spanish email templates from `web/config/clerk/`.
3. Confirm that `/sign-in`, `/sign-up`, sign-out, session persistence, and
   unauthorized states work at the stable development URL and in a Deploy Preview.
4. Create a test invitation and confirm its Clerk redirect URL begins with
   `https://colaboradoresdna.netlify.app/sign-up`.
5. Run `clerk doctor` locally and confirm that it reaches the development
   application.
6. Do not configure production Clerk keys or production domains yet.

## MongoDB Atlas checklist

Before the first database-backed deployment:

1. Create a least-privilege database user for the deployed application.
2. Configure the Atlas IP access list to permit Netlify function egress.
3. Use a dedicated non-production database for all deployments on this site.
4. Confirm that `MONGODB_URI` and `MONGODB_DB` are available in Production and
   Deploy Previews with Builds and Functions scopes.
5. Deploy the development site, exercise an SSR route and a Server Action, and inspect
   function logs for database connectivity.

Avoid a broad Atlas IP allowlist in production when a fixed-egress or private
networking option is available for the selected plans.

### Production-task model bootstrap

After the employee model assigns immutable `DNA-####` codes, inspect and create
the production-task collections and indexes with migration-capable credentials:

```bash
cd web
pnpm bootstrap:employee-model
pnpm bootstrap:production-tasks-model -- --dry-run
pnpm bootstrap:production-tasks-model
```

The dry run must report zero employees without codes and zero duplicate current
plan slots. Complete the staging import, publish, completion, undo, correction,
and rollback checks in [Production tasks](./production-tasks.md) before enabling
the module as the production source of truth.

## Development deployment checklist

- `pnpm verify` passes locally.
- `pnpm test:e2e` passes locally.
- A production-context development deploy completes successfully.
- Any enabled Deploy Preview also completes successfully.
- Every deployment uses non-production credentials.
- Clerk authentication and account recovery have been exercised.
- Critical flows, keyboard interaction, and key responsive breakpoints have
  been checked.
- No secret is present in source control or browser output.
- Other branch deploys remain disabled.
