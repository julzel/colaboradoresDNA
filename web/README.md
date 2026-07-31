# Colaboradores DNA web

Full-stack Next.js application for Colaboradores DNA with Clerk authentication and
MongoDB Atlas persistence.

## Start locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Clerk development credentials are required. The Clerk CLI can link this repository and
populate `.env.local` without exposing the values:

```bash
clerk auth login
clerk init --app app_3H9dgW0N38YwjuOrBRUcLfe2mzL
clerk doctor
```

Do not commit `.env.local`. Configure equivalent development credentials in Netlify
through its environment-variable settings.

MongoDB is optional for the current homepage. To enable database-backed features, add
the MongoDB Atlas values documented in `.env.example` to `.env.local`.

## Quality checks

```bash
pnpm verify
pnpm test:e2e
```

## Netlify

Select `web` as the site/package and base directory. The checked-in Netlify
configuration uses Netlify's `production` context as the persistent development site for
`mvp/main`. Pull-request Deploy Previews are supported and other branch deploys are
blocked.

Configure Clerk development credentials and an isolated non-production MongoDB database
as Netlify environment variables for both Production and Deploy Previews, with Builds
and Functions scopes. Live Clerk credentials are rejected by the build. See the
[deployment guide](../docs/deployment.md) for the complete setup checklist.
