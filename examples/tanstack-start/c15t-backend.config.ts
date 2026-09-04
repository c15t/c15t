/**
 * Used by `@c15t/cli self-host migrate` to create/upgrade the database schema.
 *
 * The database selection is shared with the server route
 * (`src/routes/api/self-host/$.ts`) via `lib/adapter.ts`: `DATABASE_URL`
 * when set, the embedded PGlite database otherwise.
 *
 * Local development doesn't need this: the server route migrates the
 * embedded database on first boot. Reach for the CLI (`bun run db:migrate`)
 * when pointing the demo at a real Postgres.
 */
import { defineConfig } from '@c15t/backend';

import { createAdapter } from './lib/adapter';

const { database } = await createAdapter();

export default defineConfig({
	database,
	trustedOrigins: ['localhost'],
});
