# Deployment guide

## Netlify setup

Connect the repository to Netlify and configure the project with these build
settings:

| Setting           | Value         |
| ----------------- | ------------- |
| Base directory    | `web`         |
| Build command     | `pnpm verify` |
| Publish directory | `.next`       |
| Node version      | `24`          |

`web/netlify.toml` records the build command, publish directory, Node version,
and Next.js skew protection setting. Netlify's managed Next.js/OpenNext support
handles server-rendered pages, Route Handlers, Server Actions, caching, and
image optimisation; do not pin a separate adapter dependency.

## Environment variables

Set secrets in the Netlify UI, CLI, or API rather than committing them to the
repository.

| Variable                            | Scopes               | Contexts                                                                  |
| ----------------------------------- | -------------------- | ------------------------------------------------------------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Builds and Functions | Clerk production key in Production; non-production key in Deploy Previews |
| `CLERK_SECRET_KEY`                  | Builds and Functions | Matching server-only Clerk secret for each context                        |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`     | Builds and Functions | `/sign-in`                                                                |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL`     | Builds and Functions | `/sign-up`                                                                |
| `APP_BASE_URL`                      | Builds and Functions | Canonical HTTPS URL for the current Netlify context                       |
| `MONGODB_URI`                       | Builds and Functions | Separate Production and Deploy Preview values                             |
| `MONGODB_DB`                        | Builds and Functions | Separate Production and Deploy Preview values                             |

Variables required while a page is prerendered need the Builds scope. Variables
used by SSR, Server Actions, and Route Handlers need the Functions scope.

## Clerk checklist

Before the first public deployment:

1. Create the Clerk production instance and configure the Netlify production
   domain.
2. Keep the development and production keys in their matching Netlify
   contexts; never deploy `pk_test_` or `sk_test_` credentials to Production.
3. Configure the allowed sign-in methods, invitation-only registration, account
   recovery, and Spanish email templates from `web/config/clerk/`.
4. Confirm that `/sign-in`, `/sign-up`, sign-out, session persistence, and
   unauthorized states work in a Deploy Preview.
5. Run `clerk doctor` locally before release and confirm that it reaches the
   expected application and environment.
6. Run the controlled administrator bootstrap once, verify the audit entries,
   and remove all bootstrap variables.

## MongoDB Atlas checklist

Before the first database-backed deployment:

1. Create a least-privilege database user for the deployed application.
2. Configure the Atlas IP access list to permit Netlify function egress.
3. Use different database names or clusters for Deploy Previews and Production.
4. Confirm that `MONGODB_URI` and `MONGODB_DB` are available in the correct
   Netlify contexts and scopes.
5. Deploy a preview, exercise an SSR route and a Server Action, and inspect
   function logs for database connectivity.

Avoid a broad Atlas IP allowlist in production when a fixed-egress or private
networking option is available for the selected plans.

## Release checklist

- `pnpm verify` passes locally.
- `pnpm test:e2e` passes locally.
- A Deploy Preview completes successfully.
- The preview uses non-production credentials.
- Clerk authentication and account recovery have been exercised in the preview.
- Critical flows, keyboard interaction, and key responsive breakpoints have
  been checked.
- No secret is present in source control or browser output.

## Rollback

Use Netlify's deploy history to republish the most recent known-good deploy.
Database migrations must be written so they can be reversed or safely tolerated
by the previously deployed application before they are run in production.
