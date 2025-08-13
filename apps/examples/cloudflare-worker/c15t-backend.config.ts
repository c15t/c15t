import { defineConfig } from '@c15t/backend/v2';
import { kyselyAdapter } from '@c15t/backend/v2/db/adapters';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

const db = new Kysely({
	dialect: new PostgresDialect({
		pool: new Pool({
			connectionString: 'postgresql://postgres@localhost:5432/new-db',
		}),
	}),
});

export default defineConfig({
	adapter: kyselyAdapter({ provider: 'postgresql', db }),
});
