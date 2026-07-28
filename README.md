# Colaboradores DNA

Colaboradores DNA is a full-stack web application built with Next.js, React,
TypeScript, MongoDB Atlas, and Netlify.

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

The starter page does not require a database connection. To develop a feature
that uses MongoDB, copy `web/.env.example` to `web/.env.local` and fill in the
Atlas credentials.

## Quality checks

Run these commands from `web/`:

```bash
pnpm verify          # formatting, linting, CSS checks, types, unit tests, build
pnpm test:e2e        # browser and accessibility tests
pnpm test:coverage   # unit-test coverage report
```

## Documentation

- [Architecture](./docs/architecture.md)
- [Development guide](./docs/development.md)
- [Deployment guide](./docs/deployment.md)
- [Design system](./docs/design-system.md)
- [Technology-stack decision](./tasks/done/tech-stack.md)

## Repository layout

```text
.
├── docs/       Project documentation
├── tasks/      Product and technical decisions
└── web/        Next.js application, tests, and deployment configuration
```
