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

Do not commit `.env.local` or copy development credentials to Netlify.

MongoDB is optional for the current homepage. To enable database-backed features, add
the MongoDB Atlas values documented in `.env.example` to `.env.local`.

## Quality checks

```bash
pnpm verify
pnpm test:e2e
```

## Netlify

Set the Netlify base directory to `web`. Configure Clerk production credentials and the
MongoDB values as Netlify environment variables for Builds and Functions. Use separate
credentials for Deploy Previews and Production.
