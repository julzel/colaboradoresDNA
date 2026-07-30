# Deployment guide

## Netlify Deploy Preview setup

Connect the repository to Netlify and configure the project with these build
settings:

| Setting           | Value                  |
| ----------------- | ---------------------- |
| Site/package      | `web`                  |
| Base directory    | `web`                  |
| Build command     | `pnpm netlify:preview` |
| Publish directory | `.next`                |
| Node version      | `24`                   |

`web/netlify.toml` records these settings and enables Next.js skew protection.
Netlify's managed Next.js/OpenNext support handles server-rendered pages, Route
Handlers, Server Actions, caching, and image optimisation; do not pin a
separate adapter dependency.

The repository is intentionally configured for Deploy Previews only:

- Production-context and branch-deploy Git builds are cancelled.
- The build guard rejects any Netlify build whose context is not
  `deploy-preview`, including build-hook builds that bypass Netlify's ignore
  command.
- Deploy Previews must use Clerk development keys and an isolated
  non-production MongoDB database.

In Netlify, enable Deploy Previews for pull requests and leave branch deploys
disabled. Require approval before exposing secrets to previews from untrusted
contributors. Do not publish a preview to production. The first production
release requires an explicit configuration and credential review.

## Environment variables

Set secrets in the Netlify UI, CLI, or API rather than committing them to the
repository.

Create these values for the **Deploy Previews context only**:

| Variable                            | Scopes               | Preview value                                      |
| ----------------------------------- | -------------------- | -------------------------------------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Builds and Functions | Clerk development key beginning with `pk_test_`    |
| `CLERK_SECRET_KEY`                  | Builds and Functions | Matching development key beginning with `sk_test_` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`     | Builds and Functions | `/sign-in`                                         |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL`     | Builds and Functions | `/sign-up`                                         |
| `MONGODB_URI`                       | Builds and Functions | Non-production Atlas connection string             |
| `MONGODB_DB`                        | Builds and Functions | Isolated preview database name                     |

Variables required while a page is prerendered need the Builds scope. Variables
used by SSR, Server Actions, and Route Handlers need the Functions scope.
Mark `CLERK_SECRET_KEY` and `MONGODB_URI` as secret. Do not mark
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` as secret because it is intentionally
included in browser assets.

`APP_BASE_URL` is optional for standard `*.netlify.app` Deploy Previews because
the invitation flow safely derives the active HTTPS preview origin. Set it
explicitly for a custom preview domain.

## Clerk preview checklist

Before the first Deploy Preview:

1. Add Clerk development credentials only to the Netlify Deploy Previews
   context.
2. Configure the allowed sign-in methods, invitation-only registration, account
   recovery, and Spanish email templates from `web/config/clerk/`.
3. Confirm that `/sign-in`, `/sign-up`, sign-out, session persistence, and
   unauthorized states work in a Deploy Preview.
4. Run `clerk doctor` locally and confirm that it reaches the development
   application.
5. Do not configure production Clerk keys or production domains yet.

## MongoDB Atlas checklist

Before the first database-backed Deploy Preview:

1. Create a least-privilege database user for the deployed application.
2. Configure the Atlas IP access list to permit Netlify function egress.
3. Use a dedicated non-production database for Deploy Previews.
4. Confirm that `MONGODB_URI` and `MONGODB_DB` are available only in the Deploy
   Previews context with Builds and Functions scopes.
5. Deploy a preview, exercise an SSR route and a Server Action, and inspect
   function logs for database connectivity.

Avoid a broad Atlas IP allowlist in production when a fixed-egress or private
networking option is available for the selected plans.

## Preview release checklist

- `pnpm verify` passes locally.
- `pnpm test:e2e` passes locally.
- A Deploy Preview completes successfully.
- The preview uses non-production credentials.
- Clerk authentication and account recovery have been exercised in the preview.
- Critical flows, keyboard interaction, and key responsive breakpoints have
  been checked.
- No secret is present in source control or browser output.
- Production and branch deploys remain disabled.
