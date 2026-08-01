/**
 * Used by `@c15t/cli self-host migrate` to create/upgrade the database
 * schema. Mirrors the adapter selection in `server/api/self-host/[...all].ts`:
 * Postgres when `DATABASE_URL` is set, the local SQLite file otherwise.
 */
import { defineConfig } from '@c15t/backend';
import { kyselyAdapter } from '@c15t/backend/db/adapters/kysely';
import { LibsqlDialect } from '@libsql/kysely-libsql';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

const db = connectionString
	? kyselyAdapter({
			db: new Kysely({
				dialect: new PostgresDialect({
					pool: new Pool({ connectionString }),
				}),
			}),
			provider: 'postgresql',
		})
	: kyselyAdapter({
			db: new Kysely({
				dialect: new LibsqlDialect({ url: 'file:c15t.db' }),
			}),
			provider: 'sqlite',
		});

export default defineConfig({
	adapter: db,
	trustedOrigins: ['localhost'],
});
