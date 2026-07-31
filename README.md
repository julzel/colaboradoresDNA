# Colaboradores DNA

Colaboradores DNA is a full-stack web application built with Next.js, React,
TypeScript, Clerk, MongoDB Atlas, and Netlify.

The repository is intentionally organised around a single application in
[`web/`](./web). Application code and its tooling configuration live there;
this root README and [`docs/`](./docs) provide project-level documentation.

## Start locally

### Prerequisites

- Node.js 24
- pnpm 10

### Run the application

```bash
cd web
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

The application requires Clerk development credentials to render authentication
controls. The project is already linked to its Clerk development application;
see the [development guide](./docs/development.md#authentication-with-clerk).
MongoDB remains optional until a database-backed feature is used.

## Quality checks

Run these commands from `web/`:

```bash
pnpm verify          # formatting, linting, CSS checks, types, unit tests, build
pnpm test:e2e        # browser and accessibility tests
pnpm test:coverage   # unit-test coverage report
```

## Deploy to Netlify

The Netlify site is configured as a development environment. Netlify's
`production` context deploys the configured `mvp/main` branch to a stable
development URL; it is not an application production release. Pull requests
can also receive Deploy Preview URLs. Other branch deploys remain blocked.

### Create the Netlify project

1. Push the repository to GitHub, GitLab, Bitbucket, or Azure DevOps.
2. In Netlify, select **Add new project → Import an existing project**.
3. Select this repository and configure:

   | Setting           | Value        |
   | ----------------- | ------------ |
   | Base directory    | `web`        |
   | Build command     | `pnpm build` |
   | Publish directory | `.next`      |
   | Node version      | `24`         |

Set `mvp/main` as the Netlify production branch. A push or merge to that branch
updates the stable development URL.

### Configure development environment variables

Add these variables in Netlify to both **Production** and **Deploy Previews**.
Make them available to Builds and Functions where scope controls are available.

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
MONGODB_URI=mongodb+srv://...
MONGODB_DB=colaboradores_dna_dev
```

Use Clerk development keys and a non-production MongoDB database. The build
rejects Clerk live keys. The local development database can also be used when
it is remotely reachable and sharing test data is intentional.

Mark `CLERK_SECRET_KEY` and `MONGODB_URI` as secret. Do not mark
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` as secret because it is intentionally
included in browser assets. Require approval before exposing secrets to
previews created by untrusted contributors.

### Deploy the development site

1. Keep `mvp/main` selected as the production branch and branch deploys disabled.
2. Enable Deploy Previews for pull requests if per-PR URLs are desired.
3. Merge or push to `mvp/main` to update the stable development URL, or open a
   pull request to generate a preview.
4. Confirm the build log contains one of:

   ```text
   Netlify development environment verified (production).
   Netlify development environment verified (deploy-preview).
   ```

5. Test authentication, database-backed operations, invitation links, and the
   PWA resources at `/manifest.webmanifest` and `/sw.js`.

Never configure Clerk live keys or a production database on this site. See the
[deployment guide](./docs/deployment.md) for the complete checklist.

## Documentation

- [Architecture](./docs/architecture.md)
- [Authentication and account lifecycle](./docs/authentication.md)
- [Development guide](./docs/development.md)
- [Deployment guide](./docs/deployment.md)
- [Design system](./docs/design-system.md)
- [Employee model](./docs/employee-model.md)
- [Technology-stack decision](./tasks/done/tech-stack.md)

## Repository layout

```text
.
├── docs/       Project documentation
├── tasks/      Product and technical decisions
└── web/        Next.js application, tests, and deployment configuration
```
