import { defineConfig } from '@c15t/backend';
import { kyselyAdapter } from '@c15t/backend/db/adapters/kysely';
import { LibsqlDialect } from '@libsql/kysely-libsql';
import { Kysely } from 'kysely';

const db = kyselyAdapter({
	db: new Kysely({
		dialect: new LibsqlDialect({
			url: 'file:c15t.db',
		}),
	}),
	provider: 'sqlite',
});

export default defineConfig({
	adapter: db,
	trustedOrigins: ['localhost'],
});
