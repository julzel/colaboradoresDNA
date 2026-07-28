# Colaboradores DNA web

Full-stack Next.js application for Colaboradores DNA.

## Start locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

MongoDB is optional for the starter homepage. To enable database-backed features, copy
`.env.example` to `.env.local` and replace the placeholders with the MongoDB Atlas
connection values.

## Quality checks

```bash
pnpm verify
pnpm test:e2e
```

## Netlify

Set the Netlify base directory to `web`. Store `MONGODB_URI` and `MONGODB_DB` in Netlify
environment variables for both Builds and Functions, using separate values for Deploy
Previews and Production.
