# Development guide

## Requirements

Use Node.js 24 and pnpm 10. The required versions are declared in
`web/.nvmrc` and `web/package.json`.

## Install and run

From the repository root:

```bash
cd web
pnpm install
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000). The health endpoint is
available at [http://localhost:3000/api/health](http://localhost:3000/api/health).

## Environment variables

Copy the example file before adding database-backed work:

```bash
cd web
cp .env.example .env.local
```

| Variable | Required for | Notes |
| --- | --- | --- |
| `MONGODB_URI` | MongoDB-backed features | Atlas connection URI; must remain server-only. |
| `MONGODB_DB` | MongoDB-backed features | Database name for the current environment. |

Do not commit `.env.local`, and do not use the `NEXT_PUBLIC_` prefix for
database credentials or any other secret.

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
5. Define any required indexes and document data migrations in `web/scripts/`.
6. Test the feature against the non-production database only.
