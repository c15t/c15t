import { defineConfig } from '@c15t/backend/v2';
import { kyselyAdapter } from '@c15t/backend/v2/pkgs/db-adapters';
// import { drizzle } from 'drizzle-orm/node-postgres';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
// import { LibsqlDialect } from '@libsql/kysely-libsql';
// import { Kysely } from 'kysely';

// const db = drizzle('postgresql://postgres@localhost:5432/new-db').query;

// export default defineConfig({
// 	type: 'drizzle',
// 	adapter: drizzleAdapter({
// 		db,
// 		provider: 'postgresql',
// 	}),
// });

const db = new Kysely({
	dialect: new PostgresDialect({
		pool: new Pool({
			connectionString: 'postgresql://postgres@localhost:5432/new-db',
		}),
	}),
});

// const db = new Kysely({
// 	dialect: new LibsqlDialect({
// 		url: 'http://127.0.0.1:8080',
// 	}),
// });

export default defineConfig({
	type: 'kysely',
	adapter: kyselyAdapter({
		db,
		provider: 'postgresql',
	}),
});
