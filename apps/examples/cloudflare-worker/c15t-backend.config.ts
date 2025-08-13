import { defineConfig } from '@c15t/backend/v2';
import { kyselyAdapter } from '@c15t/backend/v2/db/adapters';
import { LibsqlDialect } from '@libsql/kysely-libsql';
import { Kysely } from 'kysely';

export default defineConfig({
	adapter: kyselyAdapter({
		// @ts-expect-error - Kysely+LibsqlDialect is not typed correctly
		db: new Kysely({
			dialect: new LibsqlDialect({
				url: 'http://127.0.0.1:8080',
			}),
		}),
		provider: 'sqlite',
	}),
});
