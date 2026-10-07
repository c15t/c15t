# Self-hosted backend

A Next.js App Router app that runs the c15t consent backend itself, with
`@c15t/backend` mounted at `/api/c15t`. The banner calls that route on the same
origin. PostHog loads only after the visitor allows measurement.

## Files

- `c15t-backend.config.ts` holds the database, trusted origins and policy
  rules. The route and the migration CLI both read it.
- `app/api/c15t/[[...path]]/route.ts` mounts the backend.
- `lib/database.ts` picks the database: PGlite in `.pgdata/` during
  development, PostgreSQL from `DATABASE_URL` when deployed.
- `components/consent.tsx` points `ConsentRoot` at `/api/c15t` and renders the
  banner, the dialog and a Privacy settings link.

## Run

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/self-host dev
```

Open `http://localhost:3103`. The first start creates the local database
schema. Delete `.pgdata` to start over.

To deploy, set `DATABASE_URL` to a PostgreSQL database, run
`bun run db:migrate` against it, and add your host to `trustedOrigins`. The
server refuses to start in production without `DATABASE_URL`.

The [self-hosting quickstart](https://c15t.com/docs/self-host/quickstart) walks
through these steps.
