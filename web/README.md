# Colaboradores DNA web

Next.js App Router application with React, TypeScript, Better Auth, and MongoDB.

See the [main README](../README.md) for local setup, first-administrator bootstrap,
quality checks, and deployment. Authentication requires MongoDB, an independent
`BETTER_AUTH_SECRET`, a canonical `APP_BASE_URL`, and SMTP email delivery. There are no
Clerk runtime dependencies or required Clerk keys.

- [Authentication implementation](../docs/authentication.md)
- [Existing-database migration and rollback](../docs/better-auth-migration.md)
- [Deployment checklist](../docs/deployment.md)
- [Environment template](./.env.example)

Run commands from this directory. `pnpm verify` checks formatting, lint, styles, types,
default tests and build. Live MongoDB tests and browser tests are opt-in; see the main
README. Never copy production secrets into a preview environment.
