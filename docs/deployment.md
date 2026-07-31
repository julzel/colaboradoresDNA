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

`web/netlify.toml` records these settings and enables Next.js skew protection.
Netlify's managed Next.js/OpenNext support handles server-rendered pages, Route
Handlers, Server Actions, caching, and image optimisation; do not pin a
separate adapter dependency.

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

`APP_BASE_URL` is optional for standard `*.netlify.app` deployments because the
invitation flow safely derives the active HTTPS origin. Set it explicitly for a
custom domain.

## Clerk development checklist

Before the first deployment:

1. Add Clerk development credentials to both Netlify contexts. Never add
   `pk_live_` or `sk_live_` credentials to this site.
2. Configure the allowed sign-in methods, invitation-only registration, account
   recovery, and Spanish email templates from `web/config/clerk/`.
3. Confirm that `/sign-in`, `/sign-up`, sign-out, session persistence, and
   unauthorized states work at the stable development URL and in a Deploy Preview.
4. Run `clerk doctor` locally and confirm that it reaches the development
   application.
5. Do not configure production Clerk keys or production domains yet.

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
