# Deployment guide

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
